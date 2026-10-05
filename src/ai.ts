import type { ReadingRecord } from "./types";
import { getSettings } from "./storage";

function stripCodeFence(text: string) {
  return text.replace(/^```json\s*/i, "").replace(/^```\s*/i, "").replace(/\s*```$/i, "").trim();
}

export async function explainSelection(text: string, pageTitle: string, pageUrl: string) {
  const settings = await getSettings();
  if (!settings.apiKey) throw new Error("Please set your API key in PaperLens Settings.");

  const system = `You are PaperLens, an academic reading assistant.
The user is reading an English research paper. Explain selected text for a graduate-level AI/ML reader.
Return ONLY valid JSON:
{
  "meaning": "concise Chinese meaning",
  "context": "what it means in this paper/academic context",
  "importance": "why this phrase/sentence matters here",
  "related": ["2-4 related technical terms"]
}
Be concise. If the selection is a sentence, explain its logic rather than translating word-by-word.`;

  const user = `Paper title: ${pageTitle}
URL: ${pageUrl}
Selected text:
${text}`;

  const response = await fetch(`${settings.baseUrl.replace(/\/$/, "")}/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${settings.apiKey}`
    },
    body: JSON.stringify({
      model: settings.model,
      temperature: 0.2,
      messages: [
        { role: "system", content: system },
        { role: "user", content: user }
      ]
    })
  });

  if (!response.ok) throw new Error(`API error: ${response.status}`);
  const data = await response.json();
  const content = data.choices?.[0]?.message?.content;
  if (!content) throw new Error("The model returned no content.");
  return JSON.parse(stripCodeFence(content));
}

export async function summarizeRecords(records: ReadingRecord[]) {
  const settings = await getSettings();
  if (!settings.apiKey) throw new Error("Please set your API key in PaperLens Settings.");
  if (!records.length) return "今天还没有阅读记录。";

  const material = records.slice(0, 80).map((r, i) =>
    `${i + 1}. [${r.pageTitle}] ${r.text}\nMeaning: ${r.answer.meaning}\nContext: ${r.answer.context}\nRelated: ${r.answer.related.join(", ")}`
  ).join("\n\n");

  const response = await fetch(`${settings.baseUrl.replace(/\/$/, "")}/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${settings.apiKey}`
    },
    body: JSON.stringify({
      model: settings.model,
      temperature: 0.3,
      messages: [
        {
          role: "system",
          content: `You summarize an AI graduate student's academic reading log.
Write in Chinese with these sections:
1. 今日阅读主题
2. 核心概念（3-8个）
3. 概念之间的关系
4. 我今天真正学到的东西
5. 建议复习（3-5项）
Do not simply list translations. Infer the knowledge structure from the records.`
        },
        { role: "user", content: material }
      ]
    })
  });

  if (!response.ok) throw new Error(`API error: ${response.status}`);
  const data = await response.json();
  return data.choices?.[0]?.message?.content ?? "模型没有返回总结。";
}

export async function pushToFeishu(webhookUrl: string, text: string) {
  const response = await fetch(webhookUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ msg_type: "text", content: { text } })
  });
  if (!response.ok) throw new Error(`推送失败：HTTP ${response.status}`);
  const data: { code?: number; StatusCode?: number; msg?: string } =
    await response.json().catch(() => ({}));
  const code = data.code ?? data.StatusCode;
  if (typeof code === "number" && code !== 0) {
    throw new Error(`飞书返回错误：${data.msg ?? JSON.stringify(data)}`);
  }
}