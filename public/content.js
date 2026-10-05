(() => {
  let host = null;

  function removePopup() {
    host?.remove();
    host = null;
  }

  function createPopup(text, x, y) {
    removePopup();

    host = document.createElement("div");
    host.id = "paperlens-host";
    host.style.cssText = `
      position: fixed;
      z-index: 2147483647;
      left: ${Math.min(x, window.innerWidth - 380)}px;
      top: ${Math.min(y + 10, window.innerHeight - 500)}px;
      width: 360px;
      max-height: 470px;
      overflow: auto;
      font-family: Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
    `;

    const shadow = host.attachShadow({ mode: "open" });
    shadow.innerHTML = `
      <style>
        * { box-sizing: border-box; }
        .card {
          background: #0f172a;
          color: #e5e7eb;
          border: 1px solid #334155;
          border-radius: 16px;
          padding: 16px;
          box-shadow: 0 18px 50px rgba(0,0,0,.28);
        }
        .brand { font-size: 12px; color: #93c5fd; font-weight: 700; letter-spacing:.04em; }
        .text { margin: 8px 0 12px; font-size: 14px; line-height:1.5; }
        button {
          border:0; border-radius:10px; padding:8px 12px; cursor:pointer;
          background:#2563eb; color:white; font-weight:600;
        }
        button.secondary { background:#1e293b; border:1px solid #475569; }
        .row { display:flex; gap:8px; margin-bottom:12px; }
        .label { color:#94a3b8; font-size:11px; text-transform:uppercase; margin-top:10px; }
        .value { font-size:13px; line-height:1.5; margin-top:3px; }
        .chips { display:flex; flex-wrap:wrap; gap:6px; margin-top:6px; }
        .chip { background:#1e293b; border:1px solid #334155; padding:4px 7px; border-radius:999px; font-size:11px; }
        .error { color:#fca5a5; }
      </style>
      <div class="card">
        <div class="brand">PAPERLENS</div>
        <div class="text">${escapeHtml(text)}</div>
        <div class="row">
          <button id="explain">Explain</button>
          <button id="close" class="secondary">Close</button>
        </div>
        <div id="result"></div>
      </div>
    `;

    shadow.getElementById("close").addEventListener("click", removePopup);
    shadow.getElementById("explain").addEventListener("click", () => {
      chrome.runtime.sendMessage({
        type: "PAPERLENS_EXPLAIN",
        text,
        pageTitle: document.title,
        url: location.href
      });
      const result = shadow.getElementById("result");
      result.innerHTML = `<div class="value">正在理解这段内容…</div>`;
    });

    document.documentElement.appendChild(host);
  }

  function escapeHtml(value) {
    return value.replace(/[&<>"']/g, c => ({
      "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;"
    }[c]));
  }

  document.addEventListener("mouseup", (event) => {
    if (host && event.composedPath().includes(host)) return;

    const selection = window.getSelection();
    const text = selection?.toString().trim();
    if (!text || text.length > 3000) return;

    const range = selection.getRangeAt(0);
    const rect = range.getBoundingClientRect();
    createPopup(text, rect.left, rect.bottom);
  });

  function openFromSelection() {
    const selection = window.getSelection();
    const text = selection?.toString().trim();
    if (!text) {
      createPopup("请先选中一段英文，再按 Alt+R。", 40, 40);
      return;
    }
    const range = selection.getRangeAt(0);
    const rect = range.getBoundingClientRect();
    createPopup(text.slice(0, 3000), rect.left, rect.bottom);
  }

  chrome.runtime.onMessage.addListener((message) => {
    if (message.type === "PAPERLENS_OPEN") {
      openFromSelection();
      return;
    }
    if (message.type !== "PAPERLENS_RESULT" || !host) return;
    const result = host.shadowRoot?.getElementById("result");
    if (!result) return;

    if (message.error) {
      result.innerHTML = `<div class="value error">${escapeHtml(message.error)}</div>`;
      return;
    }

    const a = message.answer;
    const labels = a.kind === "word"
      ? { meaning: "释义", context: "文中义", importance: "用法搭配", related: "近义 / 同根" }
      : { meaning: "Meaning", context: "In this paper", importance: "Why it matters", related: "Related" };
    result.innerHTML = `
      <div class="label">${labels.meaning}</div>
      <div class="value">${escapeHtml(a.meaning || "")}</div>
      <div class="label">${labels.context}</div>
      <div class="value">${escapeHtml(a.context || "")}</div>
      <div class="label">${labels.importance}</div>
      <div class="value">${escapeHtml(a.importance || "")}</div>
      <div class="label">${labels.related}</div>
      <div class="chips">${(a.related || []).map((x) => `<span class="chip">${escapeHtml(x)}</span>`).join("")}</div>
    `;
  });
})();