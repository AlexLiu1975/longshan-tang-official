import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { after, before, test } from 'node:test';
import { collection, query, where, getDocs, doc, getDoc, setDoc, updateDoc, deleteDoc, deleteField, serverTimestamp } from 'firebase/firestore';
import {
  assertFails, assertSucceeds,
  initializeTestEnvironment
} from '@firebase/rules-unit-testing';

let testEnvironment;
const adminClaims = { email: 'beyle931224@gmail.com', email_verified: true, firebase: { sign_in_provider: 'google.com' } };

before(async () => {
  testEnvironment = await initializeTestEnvironment({
    projectId: 'demo-longshan-tang',
    firestore: {
      rules: await readFile('firestore.rules', 'utf8')
    }
  });
});

after(async () => {
  await testEnvironment?.cleanup();
});

test('unauthenticated users cannot read households', async () => {
  const database = testEnvironment.unauthenticatedContext().firestore();

  await assert.doesNotReject(
    assertFails(getDoc(doc(database, 'households', 'fixture-household')))
  );
});

test('authorized admin can create a validated household', async () => {
  const db = testEnvironment.authenticatedContext('admin-uid', adminClaims).firestore();
  await assertSucceeds(setDoc(doc(db, 'households', 'household-one'), {
    headName: '測試戶', phone: '', telephone: '', email: '', address: '', notes: '', active: true,
    createdAt: serverTimestamp(), updatedAt: serverTimestamp(), createdBy: 'admin-uid', updatedBy: 'admin-uid'
  }));
});

test('personal collections deny non-admin reads and writes', async () => {
  const db = testEnvironment.authenticatedContext('other', { email: 'other@example.com' }).firestore();
  for (const name of ['households', 'members', 'lampRegistrations']) {
    await assertFails(getDoc(doc(db, name, 'fixture')));
    await assertFails(setDoc(doc(db, name, 'fixture'), { name: '測試' }));
  }
});

test('an unverified or non-Google identity cannot access personal collections', async () => {
  for (const claims of [
    { email: 'beyle931224@gmail.com', email_verified: false, firebase: { sign_in_provider: 'google.com' } },
    { email: 'beyle931224@gmail.com', email_verified: true, firebase: { sign_in_provider: 'password' } }
  ]) {
    const db = testEnvironment.authenticatedContext('imposter', claims).firestore();
    await assertFails(getDoc(doc(db, 'households', 'household-one')));
  }
});

test('member updates preserve legacy birthday and reject moving to another household', async () => {
  const db = testEnvironment.authenticatedContext('admin-uid', adminClaims).firestore();
  const ref = doc(db, 'members', 'member-one');
  await testEnvironment.withSecurityRulesDisabled(async context => {
    await setDoc(doc(context.firestore(), 'households', 'household-one'), { headName: '測試戶' });
    await setDoc(doc(context.firestore(), 'members', 'member-one'), {
      householdId: 'household-one', name: '測試成員', relationship: '', gender: '', address: '', sameAddress: true,
      calendarType: 'legacy', birthYear: 70, birthMonth: 8, birthDay: null, isLeapMonth: false, birthHour: '', active: true,
      createdAt: new Date()
    });
  });
  const update = { birthDateGregorian: '1990-09-20', birthLunarYear: 1990, birthLunarMonth: 8, birthLunarDay: 2, birthLunarLeapMonth: false, phone: '', notes: '', updatedAt: serverTimestamp(), updatedBy: 'admin-uid' };
  await assertSucceeds(updateDoc(ref, update));
  await assertFails(updateDoc(ref, { birthYear: 71, updatedAt: new Date(), updatedBy: 'admin-uid' }));
  await assertFails(updateDoc(ref, { householdId: 'other-household', updatedAt: new Date(), updatedBy: 'admin-uid' }));
  await assertFails(deleteDoc(ref));
});

test('registration enforces relationship, price, uniqueness, and cancellation history', async () => {
  const db = testEnvironment.authenticatedContext('admin-uid', adminClaims).firestore();
  await testEnvironment.withSecurityRulesDisabled(async context => {
    await setDoc(doc(context.firestore(), 'members', 'member-one'), { householdId: 'household-one', name: '測試成員' });
  });
  const ref = doc(db, 'lampRegistrations', 'member-one_2027_taisui');
  const record = { householdId: 'household-one', memberId: 'member-one', year: 2027, lampType: 'taisui', itemName: '太歲', amount: 300, status: 'registered', notes: '', registeredAt: serverTimestamp(), cancelledAt: null, createdAt: serverTimestamp(), createdBy: 'admin-uid', updatedAt: serverTimestamp(), updatedBy: 'admin-uid' };
  await assertFails(setDoc(ref, { ...record, householdId: 'wrong-household' }));
  await assertFails(setDoc(ref, { ...record, amount: 1200 }));
  await assertSucceeds(setDoc(ref, record));
  await assertFails(setDoc(ref, record));
  await assertSucceeds(updateDoc(ref, { notes: '已確認', updatedAt: serverTimestamp(), updatedBy: 'admin-uid' }));
  const nextYear = doc(db, 'lampRegistrations', 'member-one_2028_taisui');
  const audit = { updatedAt: serverTimestamp(), updatedBy: 'admin-uid' };
  await assertSucceeds(setDoc(nextYear, { ...record, year: 2028, amountPaid: 0, paidOn: '' }));
  const annual = query(collection(db, 'lampRegistrations'), where('year', '==', 2028));
  assert.deepEqual((await getDocs(annual)).docs.map(item => item.id), [nextYear.id]);
  await assertFails(updateDoc(ref, { ...audit, amountPaid: 100 }));
  await assertFails(updateDoc(ref, { ...audit, amountPaid: 301, paidOn: '2027-01-10' }));
  await assertSucceeds(updateDoc(ref, { ...audit, amountPaid: 100, paidOn: '2027-01-10' }));
  await assertFails(updateDoc(ref, { ...audit, amountPaid: deleteField(), paidOn: deleteField() }));
  await assertSucceeds(updateDoc(ref, { ...audit, amountPaid: 300, paidOn: '2027-01-11' }));
  assert.equal((await getDoc(ref)).data().amountPaid, 300);
  await assertFails(updateDoc(ref, { status: 'cancelled', cancelledAt: serverTimestamp(), updatedAt: serverTimestamp(), updatedBy: 'admin-uid', amount: 1 }));
  await assertSucceeds(updateDoc(ref, { status: 'cancelled', cancelledAt: serverTimestamp(), updatedAt: serverTimestamp(), updatedBy: 'admin-uid' }));
  assert.equal((await getDoc(ref)).data().status, 'cancelled');
  await assertFails(deleteDoc(ref));
});
