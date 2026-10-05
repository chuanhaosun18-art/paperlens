import React, { useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import { BookOpen, Settings, Trash2, Sparkles, Send } from "lucide-react";
import { getRecords, clearRecords } from "./storage";
import type { ReadingRecord } from "./types";
import "./style.css";

function App() {
  const [records, setRecords] = useState<ReadingRecord[]>([]);
  const [summary, setSummary] = useState("");
  const [loading, setLoading] = useState(false);
  const [pushing, setPushing] = useState(false);
  const [pushMsg, setPushMsg] = useState("");

  async function refresh() {
    setRecords(await getRecords());
  }

  useEffect(() => { refresh(); }, []);

  async function summarize() {
    setLoading(true);
    try {
      const res = await chrome.runtime.sendMessage({ type: "PAPERLENS_SUMMARY" });
      if (!res || (!res.text && !res.error)) {
        throw new Error("后台没有响应，请在 chrome://extensions 重新加载扩展后再试。");
      }
      setSummary(res.error ?? res.text);
    } catch (e) {
      setSummary(e instanceof Error ? e.message : "总结失败");
    } finally {
      setLoading(false);
    }
  }

  async function push() {
    setPushing(true);
    setPushMsg("");
    try {
      const res = await chrome.runtime.sendMessage({ type: "PAPERLENS_PUSH" });
      if (!res || res.error || !res.ok) {
        throw new Error(res?.error ?? "后台没有响应，请在 chrome://extensions 重新加载扩展后再试。");
      }
      setPushMsg("已推送到飞书 ✓");
    } catch (e) {
      setPushMsg(e instanceof Error ? e.message : "推送失败");
    } finally {
      setPushing(false);
    }
  }

  async function clear() {
    await clearRecords();
    setRecords([]);
    setSummary("");
    setPushMsg("");
  }

  return (
    <main className="popup">
      <header>
        <div className="logo"><BookOpen size={18} /> PaperLens</div>
        <a href="options.html"><Settings size={16} /></a>
      </header>

      <section className="hero">
        <div>
          <div className="eyebrow">ACADEMIC READING</div>
          <h1>把查过的内容<br/>变成知识。</h1>
          <p>划词 → AI 理解 → 自动记录 → 今日总结</p>
        </div>
      </section>

      <section className="actions">
        <button className="primary" onClick={summarize} disabled={loading || !records.length}>
          <Sparkles size={16} /> {loading ? "Summarizing…" : "总结今日阅读"}
        </button>
        <button className="primary" onClick={push} disabled={pushing || !records.length}>
          <Send size={16} /> {pushing ? "Pushing…" : "推送到飞书"}
        </button>
        <button className="icon" onClick={clear} title="清空记录"><Trash2 size={16}/></button>
      </section>

      {pushMsg && <p className="muted">{pushMsg}</p>}

      {summary && <section className="summary"><div className="section-title">TODAY'S SUMMARY</div><div className="summary-text">{summary}</div></section>}

      <section>
        <div className="section-title">READING LOG · {records.length}</div>
        {!records.length && <div className="empty">还没有记录。打开一篇英文论文，选中不会的内容试试。</div>}
        <div className="records">
          {records.slice(0, 20).map(r => (
            <article key={r.id}>
              <div className="record-text">{r.text}</div>
              <div className="meaning">{r.answer.meaning}</div>
              <div className="meta">{r.pageTitle}</div>
            </article>
          ))}
        </div>
      </section>
    </main>
  );
}

createRoot(document.getElementById("root")!).render(<App />);