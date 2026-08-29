# 周文王先天易卦占卜 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 在隴善堂官網建立三籤筒抽取百位、十位、個位並以 111～888 卦碼查詢卦辭的互動占卜頁。

**Architecture:** 保留既有 `public/pages/divination.html` 路由，將頁面拆成 HTML 結構、專用 CSS、專用 JavaScript 與靜態 JSON 卦辭資料。JavaScript 以簡單狀態機強制百位→十位→個位順序，三次抽籤完成後組碼並查詢 JSON；動畫完全以 CSS class 控制，避免引入額外框架。

**Tech Stack:** HTML5、CSS3、Vanilla JavaScript、Firebase Hosting 靜態資源

**Spec:** `docs/superpowers/specs/2026-08-29-yijing-divination-design.md`

## Global Constraints

- 沿用現有 `public/styles.css` 的紅、金、米色系與網站視覺語彙。
- 每個籤筒只產生 1～8 的整數。
- 抽籤順序固定為百位 → 十位 → 個位。
- 三碼完成後才查詢卦辭。
- 卦辭資料只使用已整理原始資料，不自行補寫或改寫。
- 第一版不加入擲筊、AI 解籤、會員紀錄、分享、歷史紀錄或後台編輯。
- 支援桌機、手機、鍵盤操作與 `prefers-reduced-motion`。

---

### Task 1: 建立卦辭資料檔與完整性驗證

**Files:**
- Create: `public/data/divination.json`
- Create: `tests/divination-data.test.mjs`

**Interfaces:**
- Consumes: 已整理完成的 512 組卦碼、卦名、卦辭資料。
- Produces: JSON object，key 為三位卦碼字串，value 形如 `{ "name": string, "text": string }`。

- [ ] **Step 1: 寫資料完整性測試**

```js
import assert from 'node:assert/strict';
import fs from 'node:fs';

const data = JSON.parse(fs.readFileSync('public/data/divination.json', 'utf8'));
const keys = Object.keys(data);

assert.equal(keys.length, 512);
for (const code of keys) {
  assert.match(code, /^[1-8]{3}$/);
  assert.ok(data[code].name.trim().length > 0);
  assert.ok(data[code].text.trim().length > 0);
}
assert.equal(data['111'].name, '乾');
assert.equal(
  data['111'].text,
  '天雨問晴天必雨，天晴問雨主天晴，若要雨零看亥子，晴多雨少數分明。'
);
```

- [ ] **Step 2: 先執行測試確認失敗**

Run: `node tests/divination-data.test.mjs`

Expected: FAIL，原因為 `public/data/divination.json` 尚不存在。

- [ ] **Step 3: 由已整理 Excel/原始資料產生 `divination.json`**

檔案格式固定為：

```json
{
  "111": {
    "name": "乾",
    "text": "天雨問晴天必雨，天晴問雨主天晴，若要雨零看亥子，晴多雨少數分明。"
  }
}
```

所有合法 key 必須落在 `111`～`888` 且每一位只能是 1～8；不得以空字串、暫存文字或臆測卦辭補缺。

- [ ] **Step 4: 再執行資料測試**

Run: `node tests/divination-data.test.mjs`

Expected: PASS，512 組資料全部通過格式與 `111` 基準驗證。

- [ ] **Step 5: Commit**

```bash
git add public/data/divination.json tests/divination-data.test.mjs
git commit -m "feat: add Yijing divination data"
```

---

### Task 2: 建立三籤筒頁面結構

**Files:**
- Modify: `public/pages/divination.html`
- Create: `public/divination.css`

**Interfaces:**
- Consumes: 現有 `public/styles.css`。
- Produces: `#draw-hundreds`、`#draw-tens`、`#draw-ones` 三個按鈕，三個 `.fortune-cylinder` 容器，`#hexagram-code` 與 `#hexagram-result` 結果容器。

- [ ] **Step 1: 建立 DOM 結構測試**

Create `tests/divination-page.test.mjs`：

```js
import assert from 'node:assert/strict';
import fs from 'node:fs';

const html = fs.readFileSync('public/pages/divination.html', 'utf8');
for (const id of ['draw-hundreds', 'draw-tens', 'draw-ones', 'hexagram-code', 'hexagram-result']) {
  assert.ok(html.includes(`id="${id}"`), `missing ${id}`);
}
assert.ok(html.includes('/divination.css'));
assert.ok(html.includes('/divination.js'));
```

- [ ] **Step 2: 執行測試確認失敗**

Run: `node tests/divination-page.test.mjs`

Expected: FAIL，缺少新 DOM id 或專用資源引用。

- [ ] **Step 3: 改寫 `public/pages/divination.html`**

頁面需包含：網站返回連結、標題「周文王先天易卦」、簡短操作說明、百位／十位／個位三個籤筒、每筒抽籤按鈕、三碼顯示區、卦辭結果區與「重新占卦」按鈕。

三個籤筒使用相同語意結構：

```html
<section class="fortune-cylinder" data-place="hundreds">
  <h3>百位籤筒</h3>
  <div class="cylinder" aria-hidden="true">
    <div class="sticks"></div>
    <div class="drawn-stick"><span class="drawn-number"></span></div>
  </div>
  <button id="draw-hundreds" class="btn primary" type="button">抽百位</button>
  <p class="draw-status" aria-live="polite"></p>
</section>
```

十位與個位結構相同，只更換 `data-place`、id 與標題。十位、個位初始 `disabled`。

- [ ] **Step 4: 建立 `public/divination.css`**

定義：

```css
.divination-stage { display:grid; grid-template-columns:repeat(3,minmax(0,1fr)); gap:24px; }
.fortune-cylinder { text-align:center; }
.cylinder { position:relative; width:150px; height:220px; margin:0 auto 18px; }
.cylinder.is-shaking { animation:cylinder-shake .14s ease-in-out infinite alternate; }
.drawn-stick { transform:translateY(90px); opacity:0; }
.drawn-stick.is-revealed { animation:stick-rise .55s ease-out forwards; }
@keyframes cylinder-shake { from { transform:rotate(-2deg); } to { transform:rotate(2deg); } }
@keyframes stick-rise { to { transform:translateY(-30px); opacity:1; } }
@media (max-width:760px) { .divination-stage { grid-template-columns:1fr; } }
@media (prefers-reduced-motion: reduce) {
  .cylinder.is-shaking, .drawn-stick.is-revealed { animation-duration:.01ms; animation-iteration-count:1; }
}
```

在此基礎上補齊與既有紅金米色系一致的木質籤筒、竹籤、結果卡樣式。

- [ ] **Step 5: 執行頁面測試**

Run: `node tests/divination-page.test.mjs`

Expected: PASS。

- [ ] **Step 6: Commit**

```bash
git add public/pages/divination.html public/divination.css tests/divination-page.test.mjs
git commit -m "feat: add three-cylinder divination layout"
```

---

### Task 3: 實作抽籤狀態機與亂數

**Files:**
- Create: `public/divination.js`
- Create: `tests/divination-logic.test.mjs`

**Interfaces:**
- Consumes: 三個抽籤按鈕與結果 DOM。
- Produces: `randomDigit() -> integer 1..8`、`buildCode(hundreds,tens,ones) -> string`，以及頁面事件綁定。

- [ ] **Step 1: 寫純函式測試**

```js
import assert from 'node:assert/strict';
import { randomDigit, buildCode } from '../public/divination.js';

for (let i = 0; i < 500; i += 1) {
  const n = randomDigit();
  assert.ok(Number.isInteger(n));
  assert.ok(n >= 1 && n <= 8);
}
assert.equal(buildCode(3, 7, 8), '378');
```

- [ ] **Step 2: 執行測試確認失敗**

Run: `node tests/divination-logic.test.mjs`

Expected: FAIL，因函式尚不存在。

- [ ] **Step 3: 實作純函式**

`public/divination.js`：

```js
export function randomDigit() {
  return Math.floor(Math.random() * 8) + 1;
}

export function buildCode(hundreds, tens, ones) {
  return `${hundreds}${tens}${ones}`;
}
```

瀏覽器初始化必須放在 `if (typeof document !== 'undefined')` 之內，讓 Node 測試可 import。

- [ ] **Step 4: 實作頁面狀態**

```js
const state = {
  hundreds: null,
  tens: null,
  ones: null,
  isDrawing: false,
  data: null,
};
```

建立 `draw(place)`，先檢查 `isDrawing` 與前一位是否完成，再鎖定按鈕、播放 `is-shaking`，約 1200ms 後產生 `randomDigit()`、顯示籤支、解鎖下一位。每一位完成後不可再抽第二次。

- [ ] **Step 5: 執行純函式測試**

Run: `node tests/divination-logic.test.mjs`

Expected: PASS。

- [ ] **Step 6: Commit**

```bash
git add public/divination.js tests/divination-logic.test.mjs
git commit -m "feat: implement divination draw logic"
```

---

### Task 4: 串接卦辭資料與結果揭示

**Files:**
- Modify: `public/divination.js`
- Modify: `public/pages/divination.html`

**Interfaces:**
- Consumes: `/data/divination.json`、`buildCode()`、抽籤 state。
- Produces: 三碼合成動畫、卦碼、卦名與卦辭結果。

- [ ] **Step 1: 建立資料查詢純函式測試**

在 `tests/divination-logic.test.mjs` 增加：

```js
import { lookupHexagram } from '../public/divination.js';

const fixture = {
  '111': { name: '乾', text: '測試卦辭' }
};
assert.deepEqual(lookupHexagram(fixture, '111'), fixture['111']);
assert.equal(lookupHexagram(fixture, '888'), null);
```

- [ ] **Step 2: 執行測試確認失敗**

Run: `node tests/divination-logic.test.mjs`

Expected: FAIL，`lookupHexagram` 尚不存在。

- [ ] **Step 3: 實作資料載入與查詢**

```js
export function lookupHexagram(data, code) {
  return data[code] ?? null;
}

async function loadDivinationData() {
  const response = await fetch('/data/divination.json');
  if (!response.ok) throw new Error(`divination data HTTP ${response.status}`);
  return response.json();
}
```

頁面初始化先載入資料；失敗時停用三個抽籤按鈕並在結果區顯示「卦辭資料暫時無法載入」。

- [ ] **Step 4: 三碼完成後揭示結果**

第三支籤完成後：

1. 呼叫 `buildCode(state.hundreds, state.tens, state.ones)`。
2. 將三個數字加入 `.is-combining` class 觸發短動畫。
3. 約 450ms 後顯示完整卦碼。
4. 用 `lookupHexagram(state.data, code)` 查詢。
5. 查到時顯示卦名與原始卦辭。
6. 查不到時顯示「此卦資料尚待校對，請重新占卦或稍後再試」，並 `console.error('Missing divination code:', code)`。

- [ ] **Step 5: 實作重新占卦**

`#reset-divination` 需將三個 state 位數設回 `null`、移除所有動畫／揭示 class、清空卦碼與卦辭，只重新啟用百位按鈕。

- [ ] **Step 6: 執行測試**

Run:

```bash
node tests/divination-logic.test.mjs
node tests/divination-data.test.mjs
node tests/divination-page.test.mjs
```

Expected: 全部 PASS。

- [ ] **Step 7: Commit**

```bash
git add public/divination.js public/pages/divination.html tests/divination-logic.test.mjs
git commit -m "feat: reveal Yijing result from drawn code"
```

---

### Task 5: 響應式、可及性與整體驗收

**Files:**
- Modify: `public/divination.css`
- Modify: `public/pages/divination.html`
- Modify: `public/divination.js`

**Interfaces:**
- Consumes: 完整占卜流程。
- Produces: 桌機與手機皆可使用、鍵盤與 reduced-motion 相容的正式版本。

- [ ] **Step 1: 檢查語意與 ARIA**

確認：三個抽籤控制都是 `<button>`；結果區使用 `aria-live="polite"`；禁用狀態使用原生 `disabled`；標題順序為 h1/h2/h3 合理階層。

- [ ] **Step 2: 檢查手機版**

在 360px～430px 寬度下確認三籤筒改為垂直排列，籤筒不超出 viewport，按鈕點擊區至少約 44px 高，卦辭文字無水平捲動。

- [ ] **Step 3: 檢查桌機版**

在 1024px 以上確認三籤筒橫向等寬排列，抽出的籤不被父容器裁切，結果卡位於三筒下方且閱讀寬度適中。

- [ ] **Step 4: 檢查 reduced-motion**

模擬 `prefers-reduced-motion: reduce`，確認抽籤仍可完成、結果仍會顯示，只是不進行明顯晃動與長距離位移。

- [ ] **Step 5: 執行全部自動測試**

Run:

```bash
node tests/divination-data.test.mjs
node tests/divination-page.test.mjs
node tests/divination-logic.test.mjs
```

Expected: 全部 PASS。

- [ ] **Step 6: 手動煙霧測試固定案例**

在瀏覽器 DevTools 暫時令 `randomDigit()` 依序回傳 `1,1,1`，確認畫面最終顯示卦碼 `111`、卦名「乾」及：

`天雨問晴天必雨，天晴問雨主天晴，若要雨零看亥子，晴多雨少數分明。`

完成後恢復真正亂數實作。

- [ ] **Step 7: Commit**

```bash
git add public/divination.css public/pages/divination.html public/divination.js
git commit -m "feat: polish Yijing divination experience"
```
