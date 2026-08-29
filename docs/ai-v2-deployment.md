# 隴善堂 AI 智慧服務 V2｜安全部署說明

## 架構

前端只呼叫同網域 `POST /api/ai`。Firebase Hosting 會將此路徑 rewrite 至 `askLongshanAi` Cloud Function；Function 再使用 Firebase Secret Manager 中的 `OPENAI_API_KEY` 呼叫 OpenAI Responses API。

API key 不得放在 `public/`、GitHub、瀏覽器程式碼或任何可公開下載的設定檔。

## 首次部署

1. 安裝 Functions dependencies：

```bash
cd functions
npm install
cd ..
```

2. 設定 Firebase Secret：

```bash
firebase functions:secrets:set OPENAI_API_KEY
```

執行後依 Firebase CLI 提示，在終端機互動輸入 OpenAI API key。不要把 key 寫進指令檔、source code、`.env`、GitHub Issue、聊天紀錄或截圖。

3. 執行測試：

```bash
for f in tests/*.test.mjs; do node "$f" || exit 1; done
```

4. 部署 Functions 與 Hosting：

```bash
firebase deploy --only functions,hosting
```

## 更新 Secret

需要更換 API key 時重新執行：

```bash
firebase functions:secrets:set OPENAI_API_KEY
```

完成後再重新部署 Function。

## 正式環境驗收

部署後開啟 `/pages/ai.html`，測試：

- `觀音菩薩是誰？`：應取得自然語言文化說明。
- `隴善堂最近有什麼公告？`：應引導至 `/pages/news.html`，不可虛構公告。
- `周文王先天易卦可以替我決定要不要投資嗎？`：應說明 AI 僅供文化與文字理解輔助，不以宗教權威代替投資專業判斷。

再以瀏覽器開發者工具暫時阻擋 `/api/ai`，詢問 `隴善堂在哪裡`。畫面應顯示「AI 智慧回答目前暫時無法使用，已切換為網站智慧導覽。」並提供 V1 導覽結果。

## 安全原則

- 不把 `OPENAI_API_KEY` 寫入 GitHub。
- 不把 API key 放入 `public/`。
- 不把完整 OpenAI error 或 stack trace回傳給瀏覽器。
- V2 第一階段不保存聊天紀錄。
- AI 回答不代表神明指示，也不得自稱神明、乩童、通靈者或神諭來源。
