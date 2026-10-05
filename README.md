# PaperLens

A Chrome extension (Manifest V3) for academic reading: select text on a paper, get an explanation in place, keep an automatic reading log, and receive a daily digest pushed to Feishu.

## What it does

- **Select to explain** — highlight text on any page, click **Explain**, and the answer appears in a floating card.
- **Word vs. sentence** — a single word is explained as 释义 / 文中义 / 用法搭配 / 近义·同根; a sentence gets Meaning / In this paper / Why it matters / Related.
- **Automatic reading log** — every successful explanation is saved to `chrome.storage.local` (most recent 1000 entries), with the selected text, the answer, the page title and URL.
- **Daily digest** — a two-section report built from the log: 一、论文与 AI 趋势 and 二、英语学习.
- **Feishu push** — push the digest manually from the popup, or automatically every day at 21:00.
- **Bring your own model** — any OpenAI-compatible Chat Completions endpoint (DeepSeek, OpenAI, ...).
- **Local only** — the API key and webhook URL live in Chrome Storage. Nothing is sent anywhere except your model endpoint and Feishu.

## Build and load

```bash
npm install
npm run build
```

Then open `chrome://extensions`, enable **Developer mode**, click **Load unpacked**, and select the **`dist`** folder.

> Load `dist`, not the project root. The root `manifest.json` points at `.ts` sources, which Chrome cannot load.

## Configure

Open the extension's **Settings** page (Details → Extension options):

| Field | Example |
| --- | --- |
| API Base URL | `https://api.deepseek.com/v1` |
| Model | `deepseek-chat` |
| API Key | your key |
| Feishu Webhook URL | optional — see below |

For DeepSeek, the base URL must include `/v1` and the model must be a real DeepSeek name. The `gpt-4.1-mini` default is an OpenAI model, and DeepSeek answers `400 Model Not Exist` if you leave it.

## Usage

- Select English text on a paper → click **Explain** in the floating card.
- Press **Alt+R** to open the card for the current selection. Rebind it at `chrome://extensions/shortcuts`.
- Click the toolbar icon to see the reading log, generate the digest, or push it to Feishu.

## Feishu push

**1. Get a webhook.** Create a group (it can contain only you) → **Settings → Bots → Add bot → Custom bot**, then copy the webhook URL.

- Adding a *custom* bot requires the **desktop** client; the mobile client only offers app bots.
- If you enable a keyword under the bot's security settings, the pushed text must contain it. The message starts with `PaperLens`, so `PaperLens` is a safe keyword — or leave all security settings off.

**2. Paste it** into the extension's Settings and save.

**3. Read the digest.** It arrives as a single text message:

```text
PaperLens 每日回顾 · 2026/10/5
共 5 条记录 · 3 篇论文

━━ 一、论文与 AI 趋势 ━━
...

━━ 二、英语学习 ━━
...
```

Two triggers, with different scope:

| Trigger | Records included |
| --- | --- |
| **推送到飞书** button in the popup | all saved records |
| **Daily alarm at 21:00** | only today's records (nothing at all if there were none) |

The browser must be running — alarms do not fire while Chrome is closed. Feishu rate-limits custom bots to 100 requests/minute and suggests avoiding sends on the hour.

## Reading local PDFs

Chrome's built-in PDF viewer is a separate extension, so content scripts cannot reach it. `tools/pdfjs-viewer/` bundles a self-hosted [PDF.js](https://mozilla.github.io/pdf.js/) viewer instead — it is an ordinary web page, so selecting text works exactly as on any other site.

```text
tools/pdfjs-viewer/
  build/  web/     PDF.js 4.10.38 runtime (source maps removed)
  serve.cjs         tiny static server: correct MIME types + Range support
  start-viewer.cmd double-click to start
  pdfs/            put your own PDFs here (git-ignored)
```

1. Double-click `start-viewer.cmd` and **keep its window open** — it serves `http://localhost:8000`.
2. Open **http://localhost:8000/web/viewer.html**.
3. Either use **⋮ → Open file** in the viewer's toolbar (the PDF can live anywhere), or drop the PDF into `pdfs/` and use a bookmarkable URL:

```text
http://localhost:8000/web/viewer.html?file=/pdfs/paper.pdf
```

Notes: the server needs Node.js on your `PATH` and stops when you close its window. PDF.js is pinned to 4.10.38 because v6 uses `Map.prototype.getOrInsertComputed`, which older browsers do not implement.

## Project layout

```
src/     popup + options (React), bundled by Vite into dist/
public/  background.js + content.js + manifest.json, copied verbatim into dist/
dist/    build output — this is what you load into Chrome
tools/   helper for reading local PDFs (not part of the extension)
```

Only `popup.html` and `options.html` are built from `src/`. The **running** background service worker and content script are the plain-JS files in `public/` — edit those, then run `npm run build` (or copy them into `dist/`).

## Limitations

- **PDFs cannot be read inline.** Chrome renders PDFs with its own built-in viewer, which is a separate extension, so content scripts cannot be injected. Read the HTML version of a paper (e.g. `ar5iv.org` for arXiv), or open the PDF with the bundled [PDF.js viewer](#reading-local-pdfs).
- `chrome://` pages, the Chrome Web Store, and other extensions' pages never allow content scripts.
- `file://` pages require **Allow access to file URLs** to be enabled on the extension.

## Roadmap

- Built-in PDF.js viewer page
- Paper identification and grouping
- Local full-text search over saved records
- Streaming responses
- Spaced-repetition review cards
- Cross-paper concept graph
- Optional backend for encrypted sync
