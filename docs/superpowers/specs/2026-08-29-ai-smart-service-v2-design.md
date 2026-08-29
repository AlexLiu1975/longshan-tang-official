# 隴善堂 AI 智慧服務 V2｜設計規格

日期：2026-08-29

## 1. 目標

將目前 `public/pages/ai.html` 的 V1 關鍵詞導覽升級為真正可對話的 AI 智慧服務，同時保留既有 V1 邏輯作為備援。

V2 核心目標：

- 使用者可直接輸入自然語言問題。
- AI 可回答佛道文化、神佛典故、傳統節慶與宗教名詞。
- AI 可協助導覽隴善堂網站既有功能與公開資訊。
- API 金鑰不得出現在前端、GitHub 或瀏覽器開發者工具中。
- AI 不得宣稱代表神明、不將回答包裝成神諭或神明指示。
- AI API 無法使用時，仍以 V1 關鍵詞邏輯提供基本導覽。

## 2. 現況

目前專案已有：

- Firebase Hosting
- Firestore
- `public/pages/ai.html`
- `public/ai.js`
- `public/ai-core.js`
- `public/ai.css`
- V1 AI 頁面與核心邏輯測試

目前 `firebase.json` 尚未設定 Cloud Functions，因此 V2 需要新增 Functions codebase 與 Hosting rewrite。

## 3. 建議架構

資料流：

`瀏覽器 ai.html` → `Firebase Hosting /api/ai` → `Cloud Functions for Firebase` → `OpenAI Responses API` → `Cloud Function 清理/驗證回應` → `瀏覽器顯示`

Functions 採 Node.js 伺服器端 JavaScript，使用 OpenAI 官方 JavaScript SDK與 Responses API。

OpenAI API key 使用 Firebase `defineSecret()` 綁定 Cloud Secret Manager，只允許 AI Function 在執行時取得。

前端不持有 API key。

## 4. 元件設計

### 4.1 前端聊天介面

沿用目前 `public/pages/ai.html`、`public/ai.js` 與 `public/ai.css`。

主要調整：

- 使用者送出問題後，先呼叫 `/api/ai`。
- 顯示「思考中」狀態並暫時停用送出按鈕。
- 成功時顯示 AI 回答。
- 後端失敗、逾時或回傳格式不正確時，自動呼叫現有 `ai-core.js` V1 邏輯。
- 快速詢問按鈕仍可使用。
- 不在前端紀錄 API key 或完整後端錯誤堆疊。

### 4.2 Firebase Function

新增 `functions/`：

- `functions/package.json`
- `functions/index.js`
- `functions/lib/ai-policy.js`
- `functions/lib/validation.js`
- 對應測試

HTTP Function 暫定名稱：`askLongshanAi`。

Function 職責：

1. 僅接受 POST。
2. 解析 JSON body。
3. 驗證 `message`。
4. 限制單次輸入長度。
5. 建立固定 system/developer 指示。
6. 呼叫 OpenAI Responses API。
7. 限制輸出長度。
8. 回傳固定 JSON 格式。
9. 捕捉錯誤並回傳通用錯誤，不洩漏金鑰或內部資訊。

成功回應格式：

```json
{
  "ok": true,
  "answer": "..."
}
```

失敗回應格式：

```json
{
  "ok": false,
  "error": "AI_SERVICE_UNAVAILABLE"
}
```

### 4.3 Hosting rewrite

`firebase.json` 新增 Functions codebase 及 Hosting rewrite，讓前端固定呼叫同網域：

`POST /api/ai`

而不是在前端硬編 Functions 網址。

這可避免開發與正式環境網址分歧，也方便後續更換 Function region 或名稱。

## 5. AI 行為政策

固定提示詞必須要求模型：

- 身分為「隴善堂 AI 智慧服務」，用途是文化資訊與網站導覽。
- 使用繁體中文回覆，除非使用者要求其他語言。
- 不宣稱自己是神明、乩童、通靈者或神諭來源。
- 不聲稱能知道神明真實旨意。
- 易卦內容僅能做文化與文字理解輔助，不把 AI 解讀描述為神明裁示。
- 對醫療、法律、投資等高風險決策，不能用宗教權威取代合格專業意見。
- 若問題涉及隴善堂網站已有固定資料，優先引導至官方頁面。
- 不臆造隴善堂活動、公告、地址、電話或神佛聖誕資料。
- 不知道時明確說不知道，不虛構答案。

## 6. V2 第一階段資料範圍

第一階段不做 RAG、不建立向量資料庫，也不讓模型自行上網。

AI 可處理：

- 一般佛道文化知識
- 神佛典故與名詞解說
- 傳統節慶文化
- 使用者如何使用隴善堂網站
- 固定提供官方功能入口

隴善堂專屬資料則由 prompt 只放必要且穩定的資訊，例如：

- 名稱：隴善堂
- 定位：佛道共融・弘善教化道場
- 核心精神：敬天・禮神・行善・教化・結緣
- 官網內各功能頁路徑

活動公告與可能變動的內容，不直接寫死在 prompt；使用者詢問時導向 `/pages/news.html`。

神佛聖誕完整資料不在 V2 第一階段塞入大型 prompt；優先導向 `/pages/birthdays.html`。之後 V3 若需要，可再讓後端讀取結構化資料。

## 7. 安全與成本控制

### 7.1 Secret

- Secret 名稱：`OPENAI_API_KEY`
- 使用 Firebase `defineSecret()`。
- Secret 僅綁定 AI Function。
- 不建立 `public/config.js` 放 key。
- 不把 key commit 至 GitHub。

### 7.2 輸入限制

初始設定：

- `message` 必須是字串。
- trim 後不可為空。
- 最長 800 個 Unicode 字元。
- request body 超出合理大小直接拒絕。

### 7.3 輸出限制

以 Responses API 參數限制最大輸出 token，第一版以「短而完整」回答為原則。

### 7.4 基本濫用控制

V2 第一版至少包含：

- 僅允許 POST。
- Content-Type 驗證。
- 同網域 Hosting rewrite。
- Function timeout。
- 輸入長度限制。

若正式流量增加，再加入 App Check、IP/裝置級 rate limit 或 Cloud Armor 等較重方案。第一版不過度工程化。

## 8. 模型與 API

使用 OpenAI Responses API，而非舊式前端直接呼叫。

模型名稱不得散落在多個檔案；集中成單一常數或環境參數，方便後續更換。

實作時以 OpenAI 官方目前可用、適合低延遲文字問答的模型為準，並在正式部署前確認 API 文件與帳號可用模型。

## 9. 錯誤處理與備援

### 後端錯誤

包含：

- API key 未設定
- OpenAI API 錯誤
- timeout
- invalid request
- 模型無可用文字輸出

後端只回傳一般化錯誤碼，不把 OpenAI 原始 error 或 stack trace 傳給瀏覽器。

### 前端備援

遇到後端錯誤時：

1. 顯示簡短提示「AI 智慧回答目前暫時無法使用，已切換為網站智慧導覽。」
2. 將原問題交給 `getAiResponse()`。
3. 顯示 V1 導覽回答與既有連結。

因此即使 AI 服務停機，AI 頁面仍不是完全失效。

## 10. 對話狀態

V2 第一階段採「單輪問答」。

原因：

- 降低 API 成本。
- 不需儲存聊天紀錄。
- 不需處理個資與跨回合上下文。
- 更容易限制宗教內容的回答範圍。

介面上仍保留聊天室外觀，但每一題獨立送至後端。

多輪對話留待 V3 評估。

## 11. 隱私

V2 不將對話寫入 Firestore。

Function 只處理當次請求，不建立使用者 profile、歷史紀錄或信仰偏好資料。

若日後要做聊天紀錄，需另外設計使用者告知、保存期限、刪除方式與 Firestore 權限規則，不包含於本次範圍。

## 12. 測試策略

延續專案既有 Node `.mjs` 測試方式，並對 Functions 使用可測試的純函式拆分。

至少涵蓋：

### 前端

- AI 頁面仍載入必要 script。
- 送出訊息會呼叫 `/api/ai`。
- 後端失敗會 fallback 至 V1。
- 空白問題不送出。

### 後端純函式

- 空字串拒絕。
- 非字串拒絕。
- 超長輸入拒絕。
- 正常輸入可建立有效 AI request payload。
- AI policy 包含不冒充神明與高風險內容限制。

### HTTP Function

- GET 回 405。
- 非 JSON 回 415/400。
- 缺少 message 回 400。
- 正常請求回固定 JSON schema。
- OpenAI 錯誤時回一般化 5xx JSON，不洩漏敏感內容。

測試 OpenAI API 呼叫時，以注入 client / adapter 的方式測試，不在自動測試實際消耗 API 額度。

## 13. 部署流程

1. Commit Functions 與前端程式。
2. 在 Firebase 專案設定 `OPENAI_API_KEY` Secret。
3. 安裝 Functions dependencies。
4. 執行完整測試。
5. 部署 Functions + Hosting。
6. 使用正式網址測試 `/pages/ai.html`。
7. 測試 AI API 正常狀態。
8. 暫時模擬 Function 失敗，驗證 V1 fallback。

## 14. 不包含於 V2 第一階段

以下明確不做：

- AI 自動讀取全部 Firestore 公告
- RAG / embeddings / vector database
- AI 網路搜尋
- 使用者登入後聊天紀錄
- 語音對話
- 圖片辨識
- AI 自動執行後台管理操作
- AI 代表神明回答或裁示
- AI 自動替使用者起卦

這些功能可視實際使用需求分階段加入。

## 15. 驗收條件

V2 第一階段完成需同時符合：

1. `/pages/ai.html` 可送出自然語言問題。
2. API key 完全不在 `public/`、GitHub 或瀏覽器中。
3. 前端只呼叫同網域 `/api/ai`。
4. Firebase Function 能呼叫 OpenAI Responses API 並回傳文字。
5. API 故障時會自動 fallback 至 V1。
6. AI 明確遵守「文化與導覽輔助，不代表神明指示」政策。
7. 不保存使用者聊天紀錄。
8. 所有新增自動測試通過。
9. Firebase 正式環境完成實際 smoke test。
