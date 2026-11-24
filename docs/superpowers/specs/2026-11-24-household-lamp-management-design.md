# 隴善堂斗燈登記及家庭資料管理系統設計

## 目的

在不改變隴善堂既有公開官網、留言、公告、AI 與占卦功能的前提下，擴充現有管理後台，讓授權管理員可以維護家庭、家庭成員及年度斗燈登記。

系統以「家庭」為主要入口，避免同一戶資料分散；斗燈登記保留歷年紀錄，取消時只改狀態，不刪除歷史。

## 目標

- 管理員可依姓名、電話或地址搜尋家庭及成員。
- 管理員可建立及編輯家庭資料。
- 管理員可在家庭內建立及編輯成員資料。
- 管理員可替成員建立年度斗燈登記、修改備註或取消登記。
- 後台可依年度、斗燈種類、姓名及狀態篩選登記。
- 未登入及未授權使用者無法讀取或修改個資集合。
- 保留現有官網與管理後台功能。
- 所有正式部署均先經自動測試及 Firebase Preview Channel 驗收。

## 非目標

- 第一版不開放信眾自行登入或自行填寫資料。
- 第一版不處理線上付款、收據、會計或對帳。
- 第一版不進行既有資料的批次遷移、改名或覆寫。
- 第一版不建立公開家庭或斗燈查詢頁。
- 第一版不重寫為 React、Vue 或其他前端框架。

## 失敗條件

- 為了新功能放寬 Firestore 個資存取權限。
- 未確認既有 schema 就寫入或轉換 `households`、`members`。
- 取消登記時刪除歷史紀錄。
- 部署 Rules 或 Hosting 後造成既有留言、公告或公開官網失效。
- 正式環境出現同一成員、同年度、同斗燈種類的重複有效登記。

## 現況與限制

- 專案是原生 HTML、CSS、JavaScript，部署至 Firebase Hosting。
- 管理後台位於 `public/pages/admin.html`，行為集中於 `public/firebase-admin.js`。
- Firebase Authentication 使用 Google 登入，現行管理員判斷為指定電子郵件。
- `firestore.rules` 目前只涵蓋 `contact_messages`、`news`、`site_stats`。
- `households` 與 `members` 已存在，但目前 Firebase CLI 憑證已過期，尚未取得欄位名稱與型別。
- 個資不得出現在測試 fixture、終端輸出、Git commit 或文件內。

## Schema 確認硬性關卡

開始產品程式修改前，管理員需重新驗證 Firebase CLI。主代理只可讀取最多三筆文件的欄位名稱與 Firestore 型別，不輸出文件 ID 或欄位值。

若實際欄位與下列提案不同，停止實作，更新本設計與實作計畫並再次取得核准；不建立隱性相容層、不猜測欄位含義。

## 提案資料模型

實際欄位須通過上述關卡後定案。

### `households`

- `headName: string`：戶主或主要聯絡人姓名。
- `phone: string`：聯絡電話，可為空字串。
- `address: string`：聯絡地址，可為空字串。
- `notes: string`：內部備註，可為空字串。
- `active: boolean`：是否有效。
- `createdAt: timestamp`。
- `updatedAt: timestamp`。
- `createdBy: string`、`updatedBy: string`：管理員 UID。

### `members`

- `householdId: string`：所屬家庭文件 ID。
- `name: string`。
- `relationship: string`：與戶主關係，可為空字串。
- `gender: string`：`male`、`female`、`other` 或空字串。
- `birthDate: string`：`YYYY-MM-DD` 或空字串；不在第一版換算農曆。
- `phone: string`：可為空字串。
- `notes: string`：可為空字串。
- `active: boolean`。
- `createdAt: timestamp`、`updatedAt: timestamp`。
- `createdBy: string`、`updatedBy: string`。

### `lampRegistrations`

- `householdId: string`。
- `memberId: string`。
- `year: number`：西元年度。
- `lampType: string`：由後台受控選單提供；實際種類在 schema 確認後由使用者提供或核准。
- `status: string`：`registered` 或 `cancelled`。
- `notes: string`：可為空字串。
- `registeredAt: timestamp`。
- `cancelledAt: timestamp | null`。
- `createdAt: timestamp`、`updatedAt: timestamp`。
- `createdBy: string`、`updatedBy: string`。
- `dedupeKey: string`：`${memberId}_${year}_${lampType}`，作為文件 ID 或等效唯一鍵，防止重複有效登記。

## 使用流程

1. 管理員登入既有後台。
2. 從側欄進入「家庭資料」，以姓名、電話或地址搜尋。
3. 選擇既有家庭，或在確認無重複後建立家庭。
4. 查看家庭成員，新增或選擇成員。
5. 點選「辦理斗燈」，輸入年度、斗燈種類及備註。
6. 儲存後，在家庭詳情及斗燈總表中顯示登記。
7. 取消登記時顯示確認提示，確認後將狀態改為 `cancelled`，保留原紀錄。
8. 在「斗燈登記」頁籤依年度、種類、姓名及狀態篩選。

## 介面結構

沿用現有後台視覺與側欄，新增兩個頁籤：

- 家庭資料：搜尋列、搜尋結果、家庭表單、成員清單、成員表單及該家庭歷年登記。
- 斗燈登記：篩選列、年度摘要及登記清單。

桌面版可使用雙欄內容；860px 以下維持單欄。所有表單均使用原生 label、輸入控制項、狀態訊息與鍵盤可操作按鈕。

## 架構方案

### 方案 A：擴充既有管理後台（採用）

新增純資料驗證模組及家庭／斗燈 Firestore 管理模組，從既有 `firebase-admin.js` 初始化。優點是沿用登入與視覺、改動公開官網最少；缺點是需控制管理頁面複雜度。

### 方案 B：獨立家庭管理頁

隔離性較高，但會重複登入、Firebase 設定及後台框架，管理員需在多頁切換。

### 方案 C：重寫完整後台框架

長期元件化最好，但會引入建置流程與大量回歸範圍，不符合第一版的成本與風險目標。

## 模組邊界

- `public/admin-households-core.js`：純函式，負責正規化、驗證、搜尋、唯一鍵及狀態轉換，不直接操作 DOM 或 Firebase。
- `public/firebase-households-admin.js`：家庭、成員與斗燈的 Firestore 操作及 UI 綁定。
- `public/firebase-admin.js`：保留登入、留言與公告，登入成功後初始化新模組。
- `public/pages/admin.html`：新增頁籤與語意化表單容器。
- `public/admin.css`：新增後台元件樣式，不覆蓋公開官網。
- `firestore.rules`：新增三個集合的管理員限制與欄位驗證。

## 權限與資料安全

- 三個個資集合只允許 `isAdmin()` 成功的使用者讀寫。
- Rules 必須使用 `hasOnly`／`hasAll`、型別、長度、狀態及不可變識別欄位檢查。
- `createdBy`、`updatedBy` 必須等於 `request.auth.uid`。
- 客戶端搜尋不得把個資送到第三方服務。
- UI 不提供實體刪除家庭、成員或斗燈的操作；停用及取消均保留紀錄。
- 正式部署前保存目前 Rules 的 Git 版本；若部署失敗，可由上一個 commit 回復。

## 錯誤處理

- 權限錯誤顯示「無權限或登入已失效」，不暴露規則細節。
- 重複登記顯示明確提示並保留目前表單內容。
- 網路或寫入失敗時重新啟用按鈕，不先行修改畫面中的正式狀態。
- 查無資料與讀取失敗使用不同訊息。

## 測試與部署

- 使用 `node:test` 測試純函式、頁面結構與既有功能相容性。
- 使用 Firebase Emulator 與 `@firebase/rules-unit-testing` 驗證 Firestore Rules。
- 執行現有全部 Node 測試，確保官網功能沒有回歸。
- 使用 Firebase Hosting Preview Channel 驗證桌面與手機後台流程。
- Preview 驗收完成後才合併至 `main`；現有 GitHub Actions 再部署正式 Hosting 與 Rules。

## 尚待使用者定案

- 實際 `households`、`members` schema（需重新登入後唯讀確認）。
- 第一版允許選擇的斗燈種類。
- 是否需要保存農曆生日；目前設計只保存可選的國曆日期字串。

