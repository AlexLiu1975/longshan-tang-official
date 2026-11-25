import assert from 'node:assert/strict';
import test from 'node:test';
import {
  cancelRegistration,
  makeRegistrationId,
  matchesHouseholdSearch,
  normalizeHousehold,
  normalizeMember,
  normalizeRegistration,
  normalizeSearchTerm,
  validateHousehold,
  validateMember,
  validateRegistration
} from '../public/admin-households-core.mjs';

test('household normalization trims contact fields and rejects a blank head name', () => {
  const household = normalizeHousehold({
    headName: '   ',
    phone: ' 0912 345 678 ',
    telephone: ' 07-1234567 ',
    email: ' hall@example.com ',
    address: ' 高雄市大寮區 ',
    notes: ' 重要 ',
    active: true
  });

  assert.deepEqual(household, {
    headName: '',
    phone: '0912 345 678',
    telephone: '07-1234567',
    email: 'hall@example.com',
    address: '高雄市大寮區',
    notes: '重要',
    active: true
  });
  assert.deepEqual(validateHousehold(household), ['headName.required']);
});

test('member normalization preserves legacy birthday fields without interpreting them', () => {
  const member = normalizeMember({
    householdId: ' household-1 ',
    name: ' 王大明 ',
    relationship: ' 戶主 ',
    gender: 'male',
    address: ' 高雄市 ',
    sameAddress: false,
    calendarType: 'legacy-value',
    birthYear: 70,
    birthMonth: 8,
    birthDay: null,
    isLeapMonth: true,
    birthHour: ' 子時 ',
    birthDateGregorian: '1990-09-20',
    birthLunarYear: 1990,
    birthLunarMonth: 8,
    birthLunarDay: 2,
    birthLunarLeapMonth: false,
    phone: ' ',
    notes: ' ',
    active: true
  });

  assert.equal(member.calendarType, 'legacy-value');
  assert.equal(member.birthYear, 70);
  assert.equal(member.birthMonth, 8);
  assert.equal(member.birthDay, null);
  assert.equal(member.isLeapMonth, true);
  assert.equal(member.birthHour, '子時');
  assert.equal(member.phone, '');
  assert.equal(member.notes, '');
  assert.deepEqual(validateMember(member), []);
});

test('member validation rejects incomplete or impossible dual-calendar birthdays', () => {
  const base = normalizeMember({
    householdId: 'household-1',
    name: '測試成員',
    active: true
  });

  assert.deepEqual(
    validateMember({ ...base, birthDateGregorian: '2024-02-30' }),
    ['birthDateGregorian.invalid']
  );
  assert.deepEqual(validateMember({ ...base, birthLunarLeapMonth: true }), ['birthLunar.incomplete']);
  assert.deepEqual(
    validateMember({
      ...base,
      birthLunarYear: 2024,
      birthLunarMonth: 13,
      birthLunarDay: null,
      birthLunarLeapMonth: false
    }),
    ['birthLunar.incomplete']
  );
  assert.deepEqual(
    validateMember({
      ...base,
      birthLunarYear: 2024,
      birthLunarMonth: 13,
      birthLunarDay: 31,
      birthLunarLeapMonth: false
    }),
    ['birthLunar.invalid']
  );
});

test('registration validation pins approved lamp names and price snapshots', () => {
  const taisui = normalizeRegistration({
    householdId: ' household-1 ',
    memberId: ' member-1 ',
    year: '2027',
    lampType: 'taisui',
    itemName: '太歲',
    amount: 300,
    status: 'registered',
    notes: ' 安奉 '
  });

  assert.equal(taisui.year, 2027);
  assert.equal(taisui.notes, '安奉');
  assert.deepEqual(validateRegistration(taisui), []);
  assert.deepEqual(
    validateRegistration({ ...taisui, itemName: '斗燈', amount: 1200 }),
    ['itemSnapshot.mismatch']
  );
  assert.deepEqual(
    validateRegistration({ ...taisui, lampType: 'light', itemName: '光明燈' }),
    ['lampType.invalid']
  );
  assert.deepEqual(
    validateRegistration({ ...taisui, year: 1999 }),
    ['year.invalid']
  );
});

test('registration cancellation changes only cancellation and update metadata', () => {
  const registration = {
    householdId: 'household-1',
    memberId: 'member-1',
    year: 2027,
    lampType: 'dou_deng',
    itemName: '斗燈',
    amount: 1200,
    status: 'registered',
    notes: '原備註',
    registeredAt: 'registered-at',
    cancelledAt: null,
    createdAt: 'created-at',
    createdBy: 'creator',
    updatedAt: 'old-update',
    updatedBy: 'old-updater'
  };

  assert.deepEqual(cancelRegistration(registration, 'admin-uid', 'cancelled-at'), {
    ...registration,
    status: 'cancelled',
    cancelledAt: 'cancelled-at',
    updatedAt: 'cancelled-at',
    updatedBy: 'admin-uid'
  });
});

test('search normalizes case and whitespace across households and members', () => {
  const household = {
    headName: 'Lin Family',
    phone: '0912 345 678',
    telephone: '07-1234567',
    email: 'family@example.com',
    address: '高雄市大寮區'
  };
  const members = [{ name: '林小明', phone: '0988 000 111', address: '同戶籍地址' }];

  assert.equal(normalizeSearchTerm('  LIN   family '), 'lin family');
  assert.equal(matchesHouseholdSearch(household, members, ' LIN family '), true);
  assert.equal(matchesHouseholdSearch(household, members, '0988 000'), true);
  assert.equal(matchesHouseholdSearch(household, members, '大寮區'), true);
  assert.equal(matchesHouseholdSearch(household, members, '查無資料'), false);
});

test('registration IDs are deterministic and contain no path separators', () => {
  assert.equal(
    makeRegistrationId(' member / 1 ', '2027', 'dou_deng'),
    makeRegistrationId('member / 1', 2027, ' dou_deng ')
  );
  assert.doesNotMatch(makeRegistrationId('member / 1', 2027, 'dou_deng'), /\//);
});

test('payment status preserves unknown legacy records and validates cumulative receipts', async () => {
  const { paymentStatus, validPayment } = await import('../public/admin-households-core.mjs');
  assert.equal(paymentStatus({ amount: 1200 }), 'unknown');
  assert.equal(paymentStatus({ amount: 1200, amountPaid: 0, paidOn: '' }), 'unpaid');
  assert.equal(paymentStatus({ amount: 1200, amountPaid: 500, paidOn: '2027-01-10' }), 'partial');
  assert.equal(paymentStatus({ amount: 1200, amountPaid: 1200, paidOn: '2027-01-10' }), 'paid');
  assert.equal(validPayment(1200, 1201, '2027-01-10'), false);
  assert.equal(validPayment(1200, 500, '2027-02-30'), false);
  assert.equal(validPayment(1200, 500, ''), false);
  assert.equal(makeRegistrationId('MixedCaseID', 2027, 'dou_deng'), 'MixedCaseID_2027_dou_deng');
});
