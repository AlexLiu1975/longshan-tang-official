const LAMP_ITEMS = Object.freeze({
  taisui: Object.freeze({ itemName: '太歲', amount: 300 }),
  dou_deng: Object.freeze({ itemName: '斗燈', amount: 1200 })
});

const trim = value => typeof value === 'string' ? value.trim() : '';
const nullableInteger = value => {
  if (value === '' || value === null || value === undefined) return null;
  const number = Number(value);
  return Number.isInteger(number) ? number : value;
};

export function normalizeSearchTerm(value) {
  return trim(value).toLocaleLowerCase('zh-TW').replace(/\s+/g, ' ');
}

export function normalizeHousehold(input = {}) {
  return {
    headName: trim(input.headName),
    phone: trim(input.phone),
    telephone: trim(input.telephone),
    email: trim(input.email),
    address: trim(input.address),
    notes: trim(input.notes),
    active: input.active !== false
  };
}

export function validateHousehold(input = {}) {
  const errors = [];
  if (!trim(input.headName)) errors.push('headName.required');
  return errors;
}

export function normalizeMember(input = {}) {
  return {
    householdId: trim(input.householdId),
    name: trim(input.name),
    relationship: trim(input.relationship),
    gender: trim(input.gender),
    address: trim(input.address),
    sameAddress: input.sameAddress === true,
    calendarType: input.calendarType ?? null,
    birthYear: input.birthYear ?? null,
    birthMonth: input.birthMonth ?? null,
    birthDay: input.birthDay ?? null,
    isLeapMonth: input.isLeapMonth ?? false,
    birthHour: trim(input.birthHour),
    birthDateGregorian: trim(input.birthDateGregorian),
    birthLunarYear: nullableInteger(input.birthLunarYear),
    birthLunarMonth: nullableInteger(input.birthLunarMonth),
    birthLunarDay: nullableInteger(input.birthLunarDay),
    birthLunarLeapMonth: input.birthLunarLeapMonth === true,
    phone: trim(input.phone),
    notes: trim(input.notes),
    active: input.active !== false
  };
}

function isGregorianDate(value) {
  if (!value) return true;
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return false;
  const [, year, month, day] = match.map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  return date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day;
}

export function validateMember(input = {}) {
  const errors = [];
  if (!trim(input.householdId)) errors.push('householdId.required');
  if (!trim(input.name)) errors.push('name.required');
  if (!isGregorianDate(trim(input.birthDateGregorian))) {
    errors.push('birthDateGregorian.invalid');
  }

  const lunar = [input.birthLunarYear, input.birthLunarMonth, input.birthLunarDay];
  const presentCount = lunar.filter(value => value !== null && value !== '' && value !== undefined).length;
  if (presentCount > 0 && presentCount < 3) {
    errors.push('birthLunar.incomplete');
  } else if (presentCount === 3) {
    const [year, month, day] = lunar.map(Number);
    if (!Number.isInteger(year) || year < 1800 || year > 2200 ||
        !Number.isInteger(month) || month < 1 || month > 12 ||
        !Number.isInteger(day) || day < 1 || day > 30) {
      errors.push('birthLunar.invalid');
    }
  }
  return errors;
}

export function normalizeRegistration(input = {}) {
  return {
    householdId: trim(input.householdId),
    memberId: trim(input.memberId),
    year: Number(input.year),
    lampType: trim(input.lampType),
    itemName: trim(input.itemName),
    amount: Number(input.amount),
    status: trim(input.status) || 'registered',
    notes: trim(input.notes)
  };
}

export function validateRegistration(input = {}) {
  const errors = [];
  if (!trim(input.householdId)) errors.push('householdId.required');
  if (!trim(input.memberId)) errors.push('memberId.required');
  if (!Number.isInteger(input.year) || input.year < 2000 || input.year > 2200) {
    errors.push('year.invalid');
  }
  const approvedItem = LAMP_ITEMS[input.lampType];
  if (!approvedItem) {
    errors.push('lampType.invalid');
  } else if (input.itemName !== approvedItem.itemName || input.amount !== approvedItem.amount) {
    errors.push('itemSnapshot.mismatch');
  }
  if (!['registered', 'cancelled'].includes(input.status)) errors.push('status.invalid');
  return errors;
}

function searchValues(household, members) {
  const householdValues = [
    household.headName,
    household.phone,
    household.telephone,
    household.email,
    household.address
  ];
  const memberValues = members.flatMap(member => [member.name, member.phone, member.address]);
  return [...householdValues, ...memberValues].map(normalizeSearchTerm);
}

export function matchesHouseholdSearch(household = {}, members = [], term = '') {
  const normalizedTerm = normalizeSearchTerm(term);
  if (!normalizedTerm) return true;
  return searchValues(household, members).some(value => value.includes(normalizedTerm));
}

function registrationPart(value) {
  return encodeURIComponent(normalizeSearchTerm(value)).replaceAll('%', '~');
}

export function makeRegistrationId(memberId, year, lampType) {
  return [registrationPart(memberId), Number(year), registrationPart(lampType)].join('_');
}

export function cancelRegistration(registration, actorUid, timestamp) {
  return {
    ...registration,
    status: 'cancelled',
    cancelledAt: timestamp,
    updatedAt: timestamp,
    updatedBy: actorUid
  };
}

export { LAMP_ITEMS };
