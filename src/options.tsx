import React, { useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import { saveSettings, getSettings } from "./storage";
import "./style.css";

function App() {
  const [apiKey, setApiKey] = useState("");
  const [baseUrl, setBaseUrl] = useState("https://api.openai.com/v1");
  const [model, setModel] = useState("gpt-4.1-mini");
  const [webhookUrl, setWebhookUrl] = useState("");
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    getSettings().then(s => {
      setApiKey(s.apiKey); setBaseUrl(s.baseUrl); setModel(s.model); setWebhookUrl(s.webhookUrl);
    });
  }, []);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    await saveSettings({ apiKey, baseUrl, model, webhookUrl });
    setSaved(true);
    setTimeout(() => setSaved(false), 1800);
  }

  return (
    <main className="settings">
      <div className="settings-card">
        <div className="eyebrow">PAPERLENS</div>
        <h1>Settings</h1>
        <p className="muted">API Key 只保存在浏览器本地 Chrome Storage，不上传到 PaperLens 自己的服务器。</p>
        <form onSubmit={submit}>
          <label>API Base URL<input value={baseUrl} onChange={e => setBaseUrl(e.target.value)} placeholder="https://api.openai.com/v1" /></label>
          <label>Model<input value={model} onChange={e => setModel(e.target.value)} placeholder="gpt-4.1-mini" /></label>
          <label>API Key<input type="password" value={apiKey} onChange={e => setApiKey(e.target.value)} placeholder="sk-..." /></label>
          <label>飞书 Webhook URL（可选，用于推送每日总结）<input value={webhookUrl} onChange={e => setWebhookUrl(e.target.value)} placeholder="https://open.feishu.cn/open-apis/bot/v2/hook/..." /></label>
          <button className="primary" type="submit">{saved ? "Saved ✓" : "Save settings"}</button>
        </form>
        <div className="tip">
          <b>使用方式</b>
          <ol>
            <li>填入兼容 OpenAI Chat Completions 的 API。</li>
            <li>执行 <code>npm install</code> 和 <code>npm run build</code>。</li>
            <li>Chrome → 扩展程序 → 开发者模式 → 加载已解压的扩展程序 → 选择 <code>dist</code>。</li>
          </ol>
        </div>
      </div>
    </main>
  );
}
createRoot(document.getElementById("root")!).render(<App />);