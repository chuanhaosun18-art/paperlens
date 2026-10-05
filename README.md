# PaperLens

PaperLens is a Chrome Extension MVP for academic reading.

## Product loop

Select English text on a paper → Explain → automatically save the reading record → summarize today's reading.

## Features

- Selection popup on any webpage
- Academic-context explanation
- Meaning / paper context / importance / related concepts
- Automatic local reading history
- Today's AI reading summary
- OpenAI-compatible API endpoint
- API key stored locally in Chrome Storage

## Run

```bash
npm install
npm run build
```

Then open:

`chrome://extensions`

Enable Developer mode → Load unpacked → select the `dist` folder.

Open the extension's Settings page and configure an OpenAI-compatible API.

## Notes

This is intentionally a small MVP. The next version should add:
- PDF-specific support
- paper identification and grouping
- sentence-level context capture
- streaming responses
- local full-text search
- spaced-repetition review cards
- cross-paper concept graph
- optional backend for encrypted sync
