# Household and Lamp Management Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Extend the existing Firebase admin page so an authorized administrator can manage households, members, and annual lamp registrations without changing public-site behavior.

**Architecture:** Keep the vanilla HTML/CSS/JavaScript application. Put data validation and state transitions in a Firebase-independent core module, put Firestore and DOM orchestration in a household admin module, and initialize it from the existing authenticated admin entry point. Protect all personal data with Firestore Rules and emulator tests.

**Tech Stack:** Vanilla ES modules, Firebase Web SDK 12.18.0, Cloud Firestore, Firebase Authentication, Firebase Emulator Suite, Node.js `node:test`.

**Spec:** `docs/superpowers/specs/2026-11-24-household-lamp-management-design.md`

## Global Constraints

- Use one main agent; do not dispatch implementers or reviewers without explicit user approval.
- Do not change public website, AI, divination, contact, news, or Cloud Functions behavior.
- Do not migrate, rename, batch-update, or delete existing `households` or `members` documents.
- Do not print or commit document IDs or personal-data values.
- A cancelled registration remains stored with `status: "cancelled"`.
- Only the existing authorized administrator may read or write personal-data collections.
- Test before Preview deployment; obtain explicit approval before live deployment.

## Review Focus

- An unauthenticated or wrong-account user must receive no household, member, or registration data; covered by Task 5 emulator tests.
- Two concurrent attempts for the same member, year, and lamp type must resolve to one deterministic document; covered by Tasks 2 and 4.
- Blank optional values and whitespace-only required values must normalize consistently; covered by Task 2.
- A failed Firestore write must not leave the UI showing an unsaved state or disabled controls; covered by Task 4.
- Existing messages and news tabs must still initialize and work when the new module fails; covered by Tasks 3, 4, and 6.

---

### Task 0: Confirm Existing Schema and Freeze Decisions

**Files:**
- Modify if needed: `docs/superpowers/specs/2026-11-24-household-lamp-management-design.md`
- Modify if needed: `docs/superpowers/plans/2026-11-24-household-lamp-management.md`

**Interfaces:**
- Consumes: authenticated Firebase CLI access to project `longshan-tang-official`.
- Produces: approved exact field mapping for `households` and `members`, confirmed birthday-field mapping, and a go/no-go decision for implementation.

- [x] **Step 1: Reauthenticate without exposing credentials**

Run: `firebase login --reauth`

Expected: CLI reports the intended administrator account. User completes any browser authentication directly.

- [x] **Step 2: Read only schema shapes**

Use the authenticated Firestore REST API to inspect at most three documents per collection and output only field names and Firestore value-type keys. Do not output document paths, IDs, or values.

Expected: a field/type inventory for `households` and `members` containing no personal data. Completed with one representative document from each collection; no document ID or value was printed.

- [x] **Step 3: Compare the inventory with the proposed model**

Expected: every proposed read/write field maps to an existing field or is explicitly identified as a new field. Differences are recorded in the spec: household phone/email fields, member address fields, legacy single-calendar birthday fields, and missing update/audit fields.

- [x] **Step 4: Stop for approval if anything differs**

The spec now preserves all legacy fields, proposes explicit additive fields, forbids automatic interpretation of the legacy calendar data, and stops before Task 1 for renewed user approval.

- [x] **Step 5: Confirm lamp types, prices, and birthday representation**

Expected: the spec fixes `taisui`/「太歲」/300 and `dou_deng`/「斗燈」/1200, saves `itemName` and `amount` snapshots on each registration, and stores both Gregorian and full lunar birthday fields including leap-month state.

### Task 1: Establish the Local Test Harness

**Files:**
- Create: `package.json`
- Create: `tests/firestore-rules/firestore-rules.test.mjs`
- Modify: `.gitignore`

**Interfaces:**
- Consumes: existing Node 20+ tests and `firebase.json` Firestore configuration.
- Produces: `npm test` for all Node tests and `npm run test:rules` for isolated Firestore Rules tests.

- [ ] **Step 1: Add a deliberately failing Rules test skeleton**

Create `tests/firestore-rules/firestore-rules.test.mjs` with one test named `unauthenticated users cannot read households` that initializes `@firebase/rules-unit-testing` against the Firestore emulator and asserts rejection of `getDoc(doc(db, "households", "fixture-household"))`.

- [ ] **Step 2: Add test dependencies and scripts**

Create `package.json` with `type: "module"`, `test: "node --test tests/*.test.mjs"`, `test:rules: "firebase emulators:exec --only firestore --project demo-longshan-tang 'node --test tests/firestore-rules/firestore-rules.test.mjs'"`, and exact dev dependencies `@firebase/rules-unit-testing: "5.0.0"` and `firebase: "12.18.0"`; both support Node 20 and match the browser SDK major version.

- [ ] **Step 3: Install dependencies**

Run: `npm install`

Expected: `package-lock.json` is created and installation completes without audit-critical runtime errors.

- [ ] **Step 4: Run the existing test suite**

Run: `npm test`

Expected: all pre-existing tests pass; the Rules test may be excluded from the default command if it requires the emulator.

- [ ] **Step 5: Run the Rules skeleton**

Run: `npm run test:rules`

Expected: PASS because current Rules deny unauthenticated household reads by default.

- [ ] **Step 6: Commit**

```bash
git add package.json package-lock.json .gitignore tests/firestore-rules/firestore-rules.test.mjs
git commit -m "test: add firestore rules harness"
```

### Task 2: Implement Pure Household and Lamp Domain Rules

**Files:**
- Create: `public/admin-households-core.js`
- Create: `tests/admin-households-core.test.mjs`

**Interfaces:**
- Consumes: approved exact schema from Task 0.
- Produces: `normalizeSearchTerm(value)`, `normalizeHousehold(input)`, `validateHousehold(input)`, `normalizeMember(input)`, `validateMember(input)`, `makeRegistrationId(memberId, year, lampType)`, `normalizeRegistration(input)`, `validateRegistration(input)`, `matchesHouseholdSearch(household, members, term)`, and `cancelRegistration(registration, actorUid, timestamp)`.

- [ ] **Step 1: Write failing normalization and validation tests**

Assert that required names reject whitespace-only values, optional strings trim to `""`, invalid years, invalid lunar dates, inconsistent empty lunar fields, unapproved lamp types, and mismatched item names or amounts fail; assert legacy birthday fields are preserved unchanged; assert `cancelRegistration` preserves identity and price-snapshot fields while changing only cancellation metadata and update metadata.

- [ ] **Step 2: Run the focused tests and verify failure**

Run: `node --test tests/admin-households-core.test.mjs`

Expected: FAIL because `public/admin-households-core.js` does not exist.

- [ ] **Step 3: Implement the exported pure functions**

Use no DOM or Firebase imports. `makeRegistrationId` must deterministically encode the exact approved `memberId`, integer year, and controlled lamp type without `/` characters.

- [ ] **Step 4: Add search and duplicate-key tests**

Assert case-insensitive normalized matching across approved household/member name, phone, and address fields; assert equivalent whitespace produces the same registration ID.

- [ ] **Step 5: Run the focused tests**

Run: `node --test tests/admin-households-core.test.mjs`

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add public/admin-households-core.js tests/admin-households-core.test.mjs
git commit -m "feat: add household domain validation"
```

### Task 3: Add Accessible Admin Page Structure

**Files:**
- Modify: `public/pages/admin.html`
- Modify: `public/admin.css`
- Create: `tests/admin-households-page.test.mjs`

**Interfaces:**
- Consumes: element IDs documented in this task.
- Produces: tabs `households` and `lamps`; containers `tab-households`, `tab-lamps`, `household-search-results`, `household-editor`, `member-list`, `member-editor`, and `lamp-registration-list`; forms `household-search-form`, `household-form`, `member-form`, `lamp-registration-form`, and `lamp-filters-form`.

- [ ] **Step 1: Write failing page-structure tests**

Assert that both new tab buttons and panels exist, every input has an associated label, status regions use `role="status"` and `aria-live="polite"`, destructive-looking cancellation controls are buttons rather than links, and the existing messages/news IDs remain unchanged.

- [ ] **Step 2: Run the focused test and verify failure**

Run: `node --test tests/admin-households-page.test.mjs`

Expected: FAIL on missing household controls.

- [ ] **Step 3: Add the HTML panels and forms**

Add only fields approved in Task 0. The household form must preserve `phone`, `telephone`, and `email`. The member form must show legacy calendar fields read-only when present, plus editable Gregorian date and lunar year, month, day, and leap-month controls. The lamp form must expose only 太歲（300 元）and 斗燈（1,200 元）. Keep panels hidden until their tab is selected and use native form controls.

- [ ] **Step 4: Add responsive styles**

Extend `public/admin.css` with household result cards, member rows, filter grids, status badges, dialog-like editor sections, focus states, and single-column layout below 860px.

- [ ] **Step 5: Run the focused test**

Run: `node --test tests/admin-households-page.test.mjs`

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add public/pages/admin.html public/admin.css tests/admin-households-page.test.mjs
git commit -m "feat: add household admin interface"
```

### Task 4: Connect Firestore Operations and UI State

**Files:**
- Create: `public/firebase-households-admin.js`
- Modify: `public/firebase-admin.js`
- Create: `tests/firebase-households-admin.test.mjs`

**Interfaces:**
- Consumes: Task 2 pure functions, Task 3 element IDs, authenticated `db`, and `{ uid, email }` admin identity.
- Produces: `initHouseholdAdmin({ db, user, firestoreApi, root }) -> { loadHouseholds, loadRegistrations, destroy }`.

- [ ] **Step 1: Write failing orchestration tests with a fake Firestore API**

Assert that initialization does not run before authentication, load failures render an error without breaking existing panels, saves disable only the submitting button, failures re-enable it and retain form values, and success reloads the affected list.

- [ ] **Step 2: Run the focused tests and verify failure**

Run: `node --test tests/firebase-households-admin.test.mjs`

Expected: FAIL because the module does not exist.

- [ ] **Step 3: Implement household and member reads/writes**

Implement `initHouseholdAdmin` using injected Firestore functions in tests and Firebase 12.18.0 browser imports in production. Apply Task 2 normalization and validation before every write. Use `serverTimestamp()` and authenticated UID for audit fields.

- [ ] **Step 4: Implement deterministic lamp registration writes**

Use `makeRegistrationId` as the document ID and a Firestore transaction that rejects an existing `registered` document. Never use `addDoc` for registrations.

- [ ] **Step 5: Implement cancellation**

Require an in-UI confirmation step, then update only `status`, `cancelledAt`, `updatedAt`, and `updatedBy`. Do not call `deleteDoc` for any personal-data collection.

- [ ] **Step 6: Initialize after authorized login**

Modify `public/firebase-admin.js` so successful admin authentication initializes the module. Catch module initialization failure independently so messages and news still load.

- [ ] **Step 7: Run focused tests**

Run: `node --test tests/admin-households-core.test.mjs tests/admin-households-page.test.mjs tests/firebase-households-admin.test.mjs`

Expected: PASS.

- [ ] **Step 8: Commit**

```bash
git add public/firebase-households-admin.js public/firebase-admin.js tests/firebase-households-admin.test.mjs
git commit -m "feat: connect household and lamp management"
```

### Task 5: Lock Down Firestore Rules

**Files:**
- Modify: `firestore.rules`
- Modify: `tests/firestore-rules/firestore-rules.test.mjs`

**Interfaces:**
- Consumes: exact approved schema and existing `isAdmin()` helper.
- Produces: admin-only validated access to `households`, `members`, and `lampRegistrations` without changing existing collection behavior.

- [ ] **Step 1: Add failing authorization tests**

Assert unauthenticated and wrong-email clients cannot list, get, create, update, or delete from all three collections; assert the approved admin can perform valid reads and writes.

- [ ] **Step 2: Add failing validation tests**

Assert rejection of extra fields, wrong types, blank required names, invalid registration year, invalid lunar date parts, inconsistent empty lunar fields, unapproved lamp type, mismatched item name or amount, invalid status, actor UID mismatch, immutable `memberId`/`householdId` changes, legacy birthday-field removal or mutation, physical deletes, and cancellation updates that modify unrelated fields.

- [ ] **Step 3: Run Rules tests and verify expected failures**

Run: `npm run test:rules`

Expected: new admin-write and validation cases FAIL under current Rules.

- [ ] **Step 4: Implement collection Rules**

Add schema-specific helper functions and matches for the three collections. Preserve existing `contact_messages`, `news`, and `site_stats` blocks unchanged.

- [ ] **Step 5: Add valid-path and dedupe tests**

Assert valid creates and allowed updates pass, cancelled records remain readable, and a deterministic registration document cannot be created twice.

- [ ] **Step 6: Run Rules tests**

Run: `npm run test:rules`

Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add firestore.rules tests/firestore-rules/firestore-rules.test.mjs
git commit -m "security: protect household and lamp data"
```

### Task 6: Regression and Local Browser Verification

**Files:**
- Modify if required by defects: files already listed in Tasks 2-5 only.

**Interfaces:**
- Consumes: completed implementation.
- Produces: passing automated suite and verified desktop/mobile admin flows against emulator data only.

- [ ] **Step 1: Run all automated tests**

Run: `npm test`

Expected: PASS with no skipped tests introduced by this feature.

- [ ] **Step 2: Run Firestore Rules tests**

Run: `npm run test:rules`

Expected: PASS.

- [ ] **Step 3: Start Hosting, Auth, and Firestore emulators**

Run: `firebase emulators:start --only hosting,auth,firestore --project demo-longshan-tang`

Expected: local emulator endpoints start without using production data.

- [ ] **Step 4: Verify desktop flow**

At a desktop viewport, verify login fixture, household search/create/edit, member create/edit, registration create/filter/cancel, failure messaging, and existing message/news panels.

- [ ] **Step 5: Verify mobile flow**

At widths 390px and 820px, verify no horizontal overflow, labeled controls, keyboard navigation, visible focus, usable buttons, and readable lists.

- [ ] **Step 6: Review the diff and scope**

Run: `git diff main...HEAD --check`

Expected: no whitespace errors and no files outside the approved scope.

### Task 7: Preview Deployment and Live-Deployment Gate

**Files:**
- No source changes expected.

**Interfaces:**
- Consumes: passing Task 6 evidence and authenticated Firebase CLI.
- Produces: a Firebase Hosting Preview URL and an explicit user decision about live deployment.

- [ ] **Step 1: Re-run pre-deploy tests**

Run: `npm test && npm run test:rules`

Expected: PASS immediately before deployment.

- [ ] **Step 2: Deploy Hosting to a named Preview Channel only**

Run: `firebase hosting:channel:deploy household-lamp --only hosting --project longshan-tang-official`

Expected: Firebase returns a Preview URL. Do not deploy Firestore Rules or live Hosting in this step.

- [ ] **Step 3: Verify Preview**

Check existing public pages and authenticated admin UI on desktop and mobile. Record defects without exposing personal data.

- [ ] **Step 4: Present evidence and request live-deployment approval**

Report test results, Preview URL, changed files, Rules diff summary, known limitations, and rollback commit. Stop until the user explicitly approves production deployment.

- [ ] **Step 5: Deploy only after explicit approval**

Deploy the reviewed Firestore Rules and live Hosting through the repository's approved merge workflow. Verify the GitHub Actions run and perform production smoke tests that do not create or modify personal data.

