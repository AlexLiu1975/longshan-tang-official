import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { after, before, test } from 'node:test';
import { doc, getDoc } from 'firebase/firestore';
import {
  assertFails,
  initializeTestEnvironment
} from '@firebase/rules-unit-testing';

let testEnvironment;

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
