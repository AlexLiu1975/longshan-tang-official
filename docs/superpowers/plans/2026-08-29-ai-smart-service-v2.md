# AI 智慧服務 V2 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 將現有 V1 關鍵詞導覽升級為可透過 Firebase Functions 安全呼叫 OpenAI Responses API 的單輪 AI 問答，並保留 V1 fallback。

**Architecture:** 前端 `public/ai.js` 對同網域 `POST /api/ai` 發送單輪問題；Firebase Hosting rewrite 將請求送至 `askLongshanAi` Cloud Function。Function 從 Firebase Secret Manager 讀取 `OPENAI_API_KEY`，驗證輸入、套用固定政策、呼叫 OpenAI Responses API，再以固定 JSON schema 回傳；失敗時前端自動回退至現有 `ai-core.js`。

**Tech Stack:** Firebase Hosting、Cloud Functions for Firebase v2、Node.js 20、Firebase Secret Manager、OpenAI JavaScript SDK / Responses API、Node `assert` + `.mjs` tests。

**Spec:** `docs/superpowers/specs/2026-08-29-ai-smart-service-v2-design.md`

## Global Constraints

- API key 不得出現在 `public/`、GitHub 或瀏覽器。
- Secret 固定命名為 `OPENAI_API_KEY`，使用 Firebase `defineSecret()` 綁定 Function。
- V2 第一階段採單輪問答，不保存聊天紀錄。
- 前端固定呼叫同網域 `/api/ai`。
- 輸入 `message` trim 後不可為空，最長 800 個 Unicode 字元。
- AI 必須以繁體中文為預設，定位為文化資訊與網站導覽，不代表神明指示。
- 易卦僅提供文化與文字理解輔助，不描述為神明裁示。
- 醫療、法律、投資等高風險問題不得以宗教權威取代專業意見。
- OpenAI 或 Function 故障時必須自動 fallback 至現有 V1 `getAiResponse()`。
- V2 第一階段不做 RAG、embeddings、vector database、網路搜尋、多輪聊天或聊天紀錄。

---

### Task 1: Functions 專案骨架與 Firebase rewrite

**Files:**
- Create: `functions/package.json`
- Create: `functions/index.js`
- Modify: `firebase.json`
- Test: `tests/ai-functions-config.test.mjs`

**Interfaces:**
- Consumes: Firebase CLI / Hosting 現有設定。
- Produces: `askLongshanAi` HTTP Function 入口與 `/api/ai` rewrite。

- [ ] **Step 1: Write the failing config test**

```js
import assert from 'node:assert/strict';
import fs from 'node:fs';

const firebase = JSON.parse(fs.readFileSync('firebase.json', 'utf8'));
assert.equal(firebase.functions.source, 'functions');
assert.ok(firebase.hosting.rewrites.some(item => item.source === '/api/ai' && item.function?.functionId === 'askLongshanAi'));

const pkg = JSON.parse(fs.readFileSync('functions/package.json', 'utf8'));
assert.equal(pkg.engines.node, '20');
assert.ok(pkg.dependencies['firebase-functions']);
assert.ok(pkg.dependencies.openai);

console.log('PASS: AI Functions config');
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node tests/ai-functions-config.test.mjs`

Expected: FAIL because `functions/package.json` and/or Functions config do not exist.

- [ ] **Step 3: Create minimal Functions package and export placeholder HTTP function**

`functions/package.json`:

```json
{
  "name": "longshan-tang-functions",
  "private": true,
  "type": "module",
  "engines": { "node": "20" },
  "main": "index.js",
  "dependencies": {
    "firebase-functions": "^6.0.0",
    "openai": "^5.0.0"
  }
}
```

`functions/index.js` minimal shape:

```js
import { onRequest } from 'firebase-functions/v2/https';

export const askLongshanAi = onRequest((req, res) => {
  res.status(503).json({ ok: false, error: 'AI_SERVICE_UNAVAILABLE' });
});
```

Update `firebase.json` to include:

```json
"functions": { "source": "functions" }
```

and under `hosting`:

```json
"rewrites": [
  {
    "source": "/api/ai",
    "function": { "functionId": "askLongshanAi", "region": "asia-east1" }
  }
]
```

- [ ] **Step 4: Run config test**

Run: `node tests/ai-functions-config.test.mjs`

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add firebase.json functions/package.json functions/index.js tests/ai-functions-config.test.mjs
git commit -m "Add Firebase AI function scaffold"
```

---

### Task 2: AI 輸入驗證與固定政策

**Files:**
- Create: `functions/lib/validation.js`
- Create: `functions/lib/ai-policy.js`
- Test: `tests/ai-functions-validation.test.mjs`
- Test: `tests/ai-policy.test.mjs`

**Interfaces:**
- Produces: `validateMessage(value)` returning trimmed string or throwing `AiInputError`.
- Produces: `buildInstructions()` returning the fixed Traditional Chinese AI policy string.

- [ ] **Step 1: Write failing validation tests**

```js
import assert from 'node:assert/strict';
import { validateMessage, AiInputError } from '../functions/lib/validation.js';

assert.equal(validateMessage('  觀音菩薩是誰？  '), '觀音菩薩是誰？');
assert.throws(() => validateMessage(''), AiInputError);
assert.throws(() => validateMessage('   '), AiInputError);
assert.throws(() => validateMessage(null), AiInputError);
assert.throws(() => validateMessage('字'.repeat(801)), AiInputError);
console.log('PASS: AI input validation');
```

- [ ] **Step 2: Run validation test and confirm FAIL**

Run: `node tests/ai-functions-validation.test.mjs`

Expected: FAIL because module does not exist.

- [ ] **Step 3: Implement validation**

```js
export class AiInputError extends Error {}

export function validateMessage(value) {
  if (typeof value !== 'string') throw new AiInputError('INVALID_MESSAGE');
  const message = value.trim();
  if (!message) throw new AiInputError('EMPTY_MESSAGE');
  if ([...message].length > 800) throw new AiInputError('MESSAGE_TOO_LONG');
  return message;
}
```

- [ ] **Step 4: Write failing policy test**

```js
import assert from 'node:assert/strict';
import { buildInstructions } from '../functions/lib/ai-policy.js';

const text = buildInstructions();
for (const phrase of ['繁體中文', '不代表神明指示', '神明裁示', '醫療', '法律', '投資', '/pages/news.html', '/pages/birthdays.html']) {
  assert.ok(text.includes(phrase), `missing policy phrase: ${phrase}`);
}
console.log('PASS: AI policy');
```

- [ ] **Step 5: Run policy test and confirm FAIL**

Run: `node tests/ai-policy.test.mjs`

Expected: FAIL because module does not exist.

- [ ] **Step 6: Implement policy builder**

`buildInstructions()` must explicitly include:

```text
你是「隴善堂 AI 智慧服務」，提供佛道文化資訊與隴善堂網站導覽。預設使用繁體中文。你的回答不代表神明指示，不得宣稱自己是神明、乩童、通靈者或神諭來源。周文王先天易卦僅可做文化與文字理解輔助，不可將 AI 解讀描述為神明裁示。對醫療、法律、投資等高風險事項，不得以宗教權威取代合格專業意見。涉及可能變動的隴善堂公告時，引導至 /pages/news.html；神佛聖誕完整資料引導至 /pages/birthdays.html；不知道時明確說不知道，不得臆造隴善堂活動、地址、電話或神佛聖誕資料。
```

- [ ] **Step 7: Run both tests**

Run:

```bash
node tests/ai-functions-validation.test.mjs
node tests/ai-policy.test.mjs
```

Expected: both PASS.

- [ ] **Step 8: Commit**

```bash
git add functions/lib/validation.js functions/lib/ai-policy.js tests/ai-functions-validation.test.mjs tests/ai-policy.test.mjs
git commit -m "Add AI input validation and policy"
```

---

### Task 3: OpenAI request adapter

**Files:**
- Create: `functions/lib/openai-adapter.js`
- Test: `tests/ai-openai-adapter.test.mjs`

**Interfaces:**
- Consumes: injected object with `responses.create(payload)`.
- Produces: `askOpenAi({ client, message, model }) -> Promise<string>`.

- [ ] **Step 1: Write failing adapter test**

```js
import assert from 'node:assert/strict';
import { askOpenAi } from '../functions/lib/openai-adapter.js';

let seenPayload;
const client = {
  responses: {
    async create(payload) {
      seenPayload = payload;
      return { output_text: '測試回答' };
    }
  }
};

const answer = await askOpenAi({ client, message: '觀音菩薩是誰？', model: 'test-model' });
assert.equal(answer, '測試回答');
assert.equal(seenPayload.model, 'test-model');
assert.equal(seenPayload.input, '觀音菩薩是誰？');
assert.ok(typeof seenPayload.instructions === 'string' && seenPayload.instructions.length > 20);
assert.ok(seenPayload.max_output_tokens > 0);
console.log('PASS: OpenAI adapter');
```

- [ ] **Step 2: Run test and confirm FAIL**

Run: `node tests/ai-openai-adapter.test.mjs`

Expected: FAIL because adapter does not exist.

- [ ] **Step 3: Implement adapter**

```js
import { buildInstructions } from './ai-policy.js';

export async function askOpenAi({ client, message, model }) {
  const response = await client.responses.create({
    model,
    instructions: buildInstructions(),
    input: message,
    max_output_tokens: 500
  });
  const answer = response.output_text?.trim();
  if (!answer) throw new Error('EMPTY_AI_RESPONSE');
  return answer;
}
```

Model must be a single constant/environment value in `functions/index.js`; before implementation, verify current OpenAI API docs and available account models, then select a low-latency text model supported by Responses API.

- [ ] **Step 4: Run test**

Run: `node tests/ai-openai-adapter.test.mjs`

Expected: PASS without making a real API call.

- [ ] **Step 5: Commit**

```bash
git add functions/lib/openai-adapter.js tests/ai-openai-adapter.test.mjs
git commit -m "Add OpenAI Responses adapter"
```

---

### Task 4: HTTP Function request handling and Secret binding

**Files:**
- Modify: `functions/index.js`
- Create: `functions/lib/http-handler.js`
- Test: `tests/ai-http-handler.test.mjs`

**Interfaces:**
- Produces: `createAiHttpHandler({ ask })`, a plain `(req, res)` handler for unit testing.
- `ask(message)` returns `Promise<string>`.
- `askLongshanAi` binds `OPENAI_API_KEY` and calls handler with OpenAI adapter.

- [ ] **Step 1: Write failing HTTP handler test**

Build minimal fake `res` object that captures status and JSON. Verify:

```js
GET -> 405 { ok:false, error:'METHOD_NOT_ALLOWED' }
POST with non-JSON -> 415 { ok:false, error:'UNSUPPORTED_MEDIA_TYPE' }
POST with missing message -> 400 { ok:false, error:'INVALID_MESSAGE' }
valid POST -> 200 { ok:true, answer:'...' }
ask() throws -> 503 { ok:false, error:'AI_SERVICE_UNAVAILABLE' }
```

The test must also assert thrown text like `sk-secret-value` never appears in returned JSON.

- [ ] **Step 2: Run test and confirm FAIL**

Run: `node tests/ai-http-handler.test.mjs`

Expected: FAIL because handler does not exist.

- [ ] **Step 3: Implement pure HTTP handler**

`functions/lib/http-handler.js`:

```js
import { AiInputError, validateMessage } from './validation.js';

export function createAiHttpHandler({ ask }) {
  return async (req, res) => {
    if (req.method !== 'POST') return res.status(405).json({ ok: false, error: 'METHOD_NOT_ALLOWED' });
    if (!req.is?.('application/json')) return res.status(415).json({ ok: false, error: 'UNSUPPORTED_MEDIA_TYPE' });
    try {
      const message = validateMessage(req.body?.message);
      const answer = await ask(message);
      return res.status(200).json({ ok: true, answer });
    } catch (error) {
      if (error instanceof AiInputError) return res.status(400).json({ ok: false, error: 'INVALID_MESSAGE' });
      console.error('AI service error');
      return res.status(503).json({ ok: false, error: 'AI_SERVICE_UNAVAILABLE' });
    }
  };
}
```

- [ ] **Step 4: Bind Firebase Secret and OpenAI client in `functions/index.js`**

Use:

```js
import OpenAI from 'openai';
import { onRequest } from 'firebase-functions/v2/https';
import { defineSecret } from 'firebase-functions/params';
import { askOpenAi } from './lib/openai-adapter.js';
import { createAiHttpHandler } from './lib/http-handler.js';

const OPENAI_API_KEY = defineSecret('OPENAI_API_KEY');
const MODEL = '<verified-supported-model>';

export const askLongshanAi = onRequest(
  { region: 'asia-east1', secrets: [OPENAI_API_KEY], timeoutSeconds: 30 },
  createAiHttpHandler({
    ask: async message => {
      const client = new OpenAI({ apiKey: OPENAI_API_KEY.value() });
      return askOpenAi({ client, message, model: MODEL });
    }
  })
);
```

Replace `<verified-supported-model>` with a real current model only after checking official OpenAI docs/account availability.

- [ ] **Step 5: Run handler + existing backend tests**

Run:

```bash
node tests/ai-http-handler.test.mjs
node tests/ai-functions-validation.test.mjs
node tests/ai-policy.test.mjs
node tests/ai-openai-adapter.test.mjs
```

Expected: all PASS.

- [ ] **Step 6: Commit**

```bash
git add functions/index.js functions/lib/http-handler.js tests/ai-http-handler.test.mjs
git commit -m "Implement secure AI HTTP function"
```

---

### Task 5: Frontend API client with V1 fallback

**Files:**
- Modify: `public/ai.js`
- Test: `tests/ai-client.test.mjs`
- Modify if needed: `tests/ai-page.test.mjs`

**Interfaces:**
- Consumes: `POST /api/ai` JSON `{ message }`.
- Produces: successful AI answer or fallback result from existing `getAiResponse(message)`.

- [ ] **Step 1: Extract a testable request helper and write failing tests**

The desired helper interface:

```js
export async function requestAiAnswer(message, { fetchImpl = fetch, fallback = getAiResponse } = {})
```

Tests must assert:

```text
successful 200 JSON -> returns { answer, fallback:false }
non-2xx -> calls fallback and returns fallback:true
network throw -> calls fallback
invalid success payload -> calls fallback
empty input never reaches fetch
```

- [ ] **Step 2: Run test and confirm FAIL**

Run: `node tests/ai-client.test.mjs`

Expected: FAIL because helper does not exist or current `ai.js` does not call `/api/ai`.

- [ ] **Step 3: Implement minimal API request helper**

Use:

```js
const response = await fetchImpl('/api/ai', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ message })
});
```

Only accept `{ ok: true, answer: non-empty string }`; otherwise fallback.

- [ ] **Step 4: Integrate with current chat UI**

On submit:

1. append user bubble;
2. disable send button/input and show an AI bubble with「正在整理資料…」;
3. await `requestAiAnswer()`;
4. replace pending bubble with answer;
5. if fallback is true, prepend `AI 智慧回答目前暫時無法使用，已切換為網站智慧導覽。`;
6. re-enable input/button and focus input.

Existing quick-question buttons must use the same path.

- [ ] **Step 5: Run frontend tests**

Run:

```bash
node tests/ai-client.test.mjs
node tests/ai-page.test.mjs
node tests/ai-core.test.mjs
```

Expected: all PASS.

- [ ] **Step 6: Commit**

```bash
git add public/ai.js tests/ai-client.test.mjs tests/ai-page.test.mjs
git commit -m "Connect AI chat to backend with fallback"
```

---

### Task 6: Secret setup documentation and deployment guardrails

**Files:**
- Create: `docs/ai-v2-deployment.md`
- Modify: `.gitignore` only if local secret/config patterns are missing.
- Test: `tests/ai-secret-safety.test.mjs`

**Interfaces:**
- Produces: reproducible deployment instructions without embedding any secret value.

- [ ] **Step 1: Write failing secret-safety test**

Test scans tracked source text under `public/`, `functions/`, and config files for patterns such as `sk-` and ensures `OPENAI_API_KEY` appears only as a secret name, never as a literal value.

- [ ] **Step 2: Run and confirm test behavior**

Run: `node tests/ai-secret-safety.test.mjs`

Expected: FAIL until required paths/guardrails/documentation are present, then PASS.

- [ ] **Step 3: Add deployment document**

Document exact operator steps:

```bash
cd functions
npm install
cd ..
firebase functions:secrets:set OPENAI_API_KEY
firebase deploy --only functions,hosting
```

Also document that the API key is entered interactively and must never be pasted into source code, screenshots, GitHub Issues, or chat logs.

- [ ] **Step 4: Run safety test**

Run: `node tests/ai-secret-safety.test.mjs`

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add docs/ai-v2-deployment.md .gitignore tests/ai-secret-safety.test.mjs
git commit -m "Document secure AI deployment"
```

---

### Task 7: Full regression verification and production smoke test

**Files:**
- No production changes unless verification reveals a defect.
- Test all `tests/*.test.mjs`.

**Interfaces:**
- Produces: verified V2 deployment and verified V1 fallback.

- [ ] **Step 1: Install Functions dependencies**

Run:

```bash
cd functions && npm install && cd ..
```

Expected: exit 0 with no missing-package errors.

- [ ] **Step 2: Run full local test suite**

Run:

```bash
for f in tests/*.test.mjs; do node "$f" || exit 1; done
```

Expected: every test prints PASS and shell exits 0.

- [ ] **Step 3: Verify no API key is committed**

Run a repository search for `sk-`, `OPENAI_API_KEY=` and known local secret patterns.

Expected: no literal API key value.

- [ ] **Step 4: Configure Firebase secret**

Run interactively:

```bash
firebase functions:secrets:set OPENAI_API_KEY
```

Expected: secret created/updated without echoing the secret into committed files.

- [ ] **Step 5: Deploy Functions + Hosting**

Run:

```bash
firebase deploy --only functions,hosting
```

Expected: successful deployment of `askLongshanAi` and Hosting rewrite.

- [ ] **Step 6: Production smoke test**

Open `/pages/ai.html` and verify these cases:

```text
「觀音菩薩是誰？」 -> receives natural-language AI answer
「隴善堂最近有什麼公告？」 -> answer directs user to /pages/news.html without inventing announcements
「周文王先天易卦可以替我決定要不要投資嗎？」 -> explains cultural-assistance boundary and does not present divine investment advice
```

- [ ] **Step 7: Verify fallback**

Temporarily test with backend request blocked/failing in browser devtools or emulator; submit `隴善堂在哪裡`.

Expected: UI states it switched to website smart guide and displays the V1 response from `getAiResponse()`.

- [ ] **Step 8: Final commit only if verification required fixes**

If no code changes were required, do not create an empty commit. If fixes were required, add a regression test first, confirm RED → GREEN, then commit with a focused message.
