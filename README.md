# pi-web-tools

給 [pi](https://pi.dev) 的 web tools extension package：

- **`web_fetch`**：Playwright Chromium headless 渲染網頁，輸出清理後 Markdown／純文字。
- **OpenAI 模式**：只注入 OpenAI 原生 `web_search`，**不註冊同名 function tool、不處理 OpenAI 密鑰**。
- **Brave／Exa 模式**：註冊自訂 `web_search`，回傳來源與供應商 snippets，不額外呼叫摘要模型。

目標環境：Node.js 22+、pi **0.85.1**（`@earendil-works/*` namespace）。舊 `@mariozechner/*` 發行版未驗證。

## 安裝

在這個專案目錄：

```sh
npm install
npm run browser:install
pi install /absolute/path/to/pi-web-tools
```

進入已開啟的 pi 後執行 `/reload`。也可先試用 `pi -e ./src/index.ts`。

Chromium 由 Playwright 的明確安裝指令下載，extension 載入時不下載／啟動瀏覽器。Linux 如缺系統依賴，可在套件目錄執行 `npx --no-install playwright install --with-deps chromium --no-shell`（可能需管理員權限）。

日後從 npm／git 安裝：套件包含 TS runtime source，無需建置；production dependencies 必須完整安裝。在安裝的套件目錄執行 `npm run browser:install`，確保 browser revision 與套件鎖定的 Playwright 版本一致。Chromium 不會打包進 npm tarball。`channel: "chrome"` 可使用本機已安裝的 Google Chrome，但不使用個人 profile。

## 設定

固定路徑：**`~/.pi/agent/web_search.json`**。設定只在 extension 載入時讀取，變更後 `/reload`；不覆寫 pi 的 `settings.json`／`auth.json`。

### OpenAI 原生搜尋（預設）

```json
{
  "provider": "openai",
  "enabled": true
}
```

沒有設定檔時也採用這個模式。API key／登入由 pi 自行管理。extension 只在目前模型為已知 OpenAI Responses provider 時，於 `before_provider_request` 加入：

```json
{
  "tools": [{ "type": "web_search" }],
  "include": ["web_search_call.action.sources"]
}
```

這是**追加合併**：不刪既有 tools/include，不覆寫 tool_choice，不重複加入原生工具。模型自行決定何時搜尋，不強迫每輪搜尋。若已有 `web_search_preview` 會保留它。

支援的請求 gate：

| 目前模型 provider / API | 行為 |
| --- | --- |
| `openai` / `openai-responses` | 注入原生搜尋；模型仍須支援 hosted search |
| `azure-openai-responses` / `azure-openai-responses` | 注入；部署／API 版本支援需自行確認 |
| `openai-codex` / `openai-codex-responses` | 預設不注入；實驗性選用如下 |
| Claude、Gemini、Chat Completions、自訂 proxy provider | 不注入，不冒稱可用 |

**Codex 訂閱實驗模式：**

```json
{
  "provider": "openai",
  "providers": {
    "openai": { "experimentalCodex": true }
  }
}
```

此開關只允許向 Codex payload 注入 hosted tool，**不保證訂閱 backend 接受**。需使用自己的合法訂閱實際驗收。若端點拒絕參數，關閉開關並 `/reload`。不會改用付費 API、不複製 token、不自行更新 OAuth。一般 OpenAI、Azure、Codex 的 live 搜尋及引用顯示目前均未以真實憑證驗證。

**已確認的 pi 0.85.1 限制：**其 Responses stream decoder 丟棄 `web_search_call` source objects 與 `url_citation` annotations，只保留答案文字；此限制包含一般 OpenAI／Azure，不只是 Codex。套件會要求模型在答案中直接輸出 Markdown URL 連結，但這只是提示，不是可靠的 annotation 保存。若需要可機器驗證的完整來源清單，請使用 Brave／Exa；完整原生引用保留需要 pi 上游 decoder 支援，不能只靠開啟工具。

原生搜尋由當前模型執行，因此切換到其他 provider 後不再可用。若需要跨模型一致搜尋，改用 Brave／Exa。原生搜尋費用與配額由當前 OpenAI 帳號／服務規則決定。

**同名衝突：**不要同時啟用其他提供／改寫 `web_search` 的 extension（包括原本的 pi-openai-web-search）。本套件在原生注入時偵測同名 function tool 會明確中止當前請求並報錯，不刪除對方工具。pi 在多個 local extension 註冊同名工具時也可能報重複名稱錯誤，請停用其中一個。

### Brave Search

```json
{
  "provider": "brave",
  "providers": {
    "brave": { "apiKeyEnv": "BRAVE_API_KEY" }
  }
}
```

在啟動 pi 的 shell 中設定 `BRAVE_API_KEY`。使用 Web Search endpoint 與 `X-Subscription-Token`。

### Exa

```json
{
  "provider": "exa",
  "providers": {
    "exa": { "apiKeyEnv": "EXA_API_KEY" }
  }
}
```

使用 Search endpoint、`type: "auto"` 及 highlights，不啟用額外生成答案功能。

也可用 `"apiKey": "your-key"`，但不可與 `apiKeyEnv` 同時出現；建議優先環境變數。明文設定應 `chmod 600 ~/.pi/agent/web_search.json`。不支援 shell command 型密鑰。錯誤訊息不包含 HTTP 回應 body 或認證 headers。

完整範例見 [examples/web_search.json](examples/web_search.json)，結構見 [schemas/web_search.schema.json](schemas/web_search.schema.json)。Schema 檔供編輯器外部關聯；設定本身不接受 `$schema` 等未知欄位。

其他設定：

| 欄位 | 預設 | 範圍／說明 |
| --- | --- | --- |
| `enabled` | `true` | 只控制搜尋，`web_fetch` 保持可用 |
| `numResults` | `5` | REST 搜尋 1–10；不控制 OpenAI 原生來源數 |
| `searchTimeoutMs` | `60000` | 1000–120000；僅 REST 搜尋 |
| `fetch.channel` | `chromium` | `chromium`／`chrome` |
| `fetch.timeoutMs` | `30000` | 1000–120000 |
| `fetch.maxConcurrency` | `2` | 1–4 |
| `fetch.idleTimeoutMs` | `60000` | 1000–300000 |

非法設定會停用搜尋注入／註冊並提示錯誤；`web_fetch` 仍以安全預設運作。不默默切到其他付費來源。

## 工具

### `web_fetch`

```json
{
  "url": "https://example.com/docs",
  "format": "markdown",
  "extraction": "auto",
  "waitForSelector": "main"
}
```

只有 `url` 必填。`format` 為 `markdown`／`text`；`extraction` 為 `auto`／`main`／`body`。`waitForSelector` 適合延遲渲染 SPA，並非每次需要。

- 等待 DOMContentLoaded 和有界限的內容就緒，不依賴 networkidle。
- Readability 擷取文章，必要時回退 main／body；回傳實際 extraction method。
- 去掉 script、導覽與明確非正文元素，保留程式碼、列表、表格及安全絕對連結。
- 每次獨立 context，cookies／storage 不跨呼叫共享；browser 共用並閒置回收。
- 取消只影響該次抓取；session shutdown／reload 清理 browser。
- 回傳 title、最終 URL、HTTP status、取得時間與警告；不是 AI 摘要。
- HTTP 錯誤、不支援內容或空內容不冒充成功。反爬與登入頁偵測僅啟發式，不能保證識別所有阻擋頁。

### `web_search`（僅 Brave／Exa 模式）

```json
{
  "query": "Playwright Chromium headless documentation",
  "provider": "brave",
  "numResults": 5
}
```

只有 `query` 必填；provider 可在 Brave／Exa 間明確選擇，省略時用設定值。query 最長 2000 字元。回傳 URL、title、provider snippet／highlight 及可取得的日期。沒有來源原文就不補造；閱讀全文使用 `web_fetch`。

一次只查一個來源；不跨 provider fallback，不自動重試，避免重複計費。429 提示有限格式的 Retry-After；逾時／取消中止 HTTP 請求。

## 輸出與安全

- Tool content 上限 **24 KiB／1000 行**（包含截斷提示）。頁面抽取內容上限 1 MiB；工具格式化結果另有 2 MiB 上限，原始／渲染 HTML 上限 5 MiB。
- 超長結果以 `0600` 權限存放在 OS temp 的 `pi-web-tools-*` 目錄，回傳絕對路徑，可用 pi `read` 分頁。
- 暫存檔不是永久紀錄；可能被 OS 清理。套件不在 shutdown 立即刪除，以便接續讀取；使用者可在不需要時刪除這些目錄。
- 瀏覽器只存取公開 HTTP(S)，預設阻擋私有／loopback／link-local／metadata 位址。初始 URL、redirect 與子資源均檢查；拒絕 URL 內嵌帳密。
- **不是完整安全沙箱**：DNS 檢查與實際連線間仍可能有競態；高敏感環境需 OS／container egress 控制。Chromium 也會執行遠端 JavaScript。
- 為逐跳驗證 redirect，網路路由透過 Playwright 的 context request 取回回應再交給 browser；主頁 redirect 重新導覽，子資源 redirect 手動跟隨。部分重新導向子資源的相對 URL 語意可能與普通瀏覽不同。
- Playwright 會先緩衝網路回應才進行大小檢查，這些限制不是總流量／峰值記憶體上限；不適合當作公開、多租戶抓取服務。
- 不使用個人 cookies，不登入、不繞 CAPTCHA／付費牆、不處理 PDF／影音或下載。
- 頁面／搜尋內容是外部不可信資料；清理 HTML 不會消除 prompt injection。不要遵循頁面要求去讀取本機密鑰。
- 網頁／搜尋結果會進入 pi 對話與模型供應商；請勿抓取或搜尋不應傳送的敏感內容。

`/web-tools status` 顯示設定路徑、目前模型的原生搜尋開關、REST 密鑰是否設定與 browser service 初始化狀態；不發送網路探測、不驗證 key、不顯示 key。

## 開發與驗證

```sh
npm run typecheck
npm test
npm run test:integration
npm pack --dry-run
```

單元測試使用 mock HTTP，不需要 API key。integration 使用真實 Chromium 與本機 fixture server；私有位址允許僅用於程式內測試選項，不暴露給工具／使用者設定。真實 provider 測試需自行授權，不能把 mock 通過視為真實 backend 通過。

## 設計參考

- [pi-openai-web-search](https://github.com/code-yeongyu/pi-openai-web-search)：原生 payload 注入模式的參考；本套件沒有複製其程式碼，亦不沿用它移除同名工具的行為。
- [Playwright browsers](https://playwright.dev/docs/browsers)
- [Mozilla Readability](https://github.com/mozilla/readability)
- [OpenAI web search](https://platform.openai.com/docs/guides/tools-web-search)

MIT License.
