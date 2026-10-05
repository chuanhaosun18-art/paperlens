const DEFAULT_SETTINGS = {
  apiKey: "",
  baseUrl: "https://api.openai.com/v1",
  model: "gpt-4.1-mini",
  webhookUrl: ""
};

async function getSettings() {
  const result = await chrome.storage.local.get("paperlens_settings");
  return { ...DEFAULT_SETTINGS, ...(result.paperlens_settings || {}) };
}

async function getRecords() {
  const result = await chrome.storage.local.get("paperlens_records");
  return result.paperlens_records || [];
}

function stripCodeFence(text) {
  return text.replace(/^```json\s*/i, "").replace(/^```\s*/i, "").replace(/\s*```$/i, "").trim();
}

async function explain(text, pageTitle, pageUrl) {
  const settings = await getSettings();
  if (!settings.apiKey) throw new Error("请先打开 PaperLens 设置并填写 API Key。");

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
        {
          role: "system",
          content: `You are PaperLens, an English academic reading assistant.
The user is reading an English research paper and selected some text. Decide whether the selection is a single word/phrase or a sentence/paragraph, then explain accordingly for a graduate-level AI/ML reader.
Return ONLY valid JSON:
{"kind":"word"|"sentence","meaning":"...","context":"...","importance":"...","related":["..."]}
Rules:
- kind is "word" for a single word or short phrase; "sentence" for a full sentence or longer.
- If kind is "word": meaning = 简明中文释义（含词性）; context = 该词在这篇论文里的具体含义; importance = 常见搭配与用法; related = 2-4 个近义词或同根词.
- If kind is "sentence": meaning = 这句话的中文意思; context = 在这篇论文语境中的含义; importance = 为什么它在这里重要; related = 2-4 个相关术语.
Write explanations in Chinese, concise. For sentences, explain the logic rather than translating word by word.`
        },
        {
          role: "user",
          content: `Paper title: ${pageTitle}\nURL: ${pageUrl}\nSelected text:\n${text}`
        }
      ]
    })
  });
  if (!response.ok) {
    const detail = await response.text().catch(() => "");
    throw new Error(`API error: ${response.status} ${detail.slice(0, 300)}`);
  }
  const data = await response.json();
  const content = data.choices?.[0]?.message?.content;
  if (!content) throw new Error("模型没有返回内容。");
  return JSON.parse(stripCodeFence(content));
}

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === "PAPERLENS_SUMMARY") {
    (async () => {
      try {
        const records = await getRecords();
        sendResponse({ text: await buildDailyReport(records) });
      } catch (e) {
        sendResponse({ error: e instanceof Error ? e.message : String(e) });
      }
    })();
    return true;
  }

  if (message.type === "PAPERLENS_PUSH") {
    (async () => {
      try {
        const settings = await getSettings();
        if (!settings.webhookUrl) throw new Error("请先在设置里填写飞书 Webhook URL。");
        const records = await getRecords();
        await pushToFeishu(settings.webhookUrl, await buildDailyReport(records));
        sendResponse({ ok: true });
      } catch (e) {
        sendResponse({ error: e instanceof Error ? e.message : String(e) });
      }
    })();
    return true;
  }

  if (message.type !== "PAPERLENS_EXPLAIN") return;

  (async () => {
    try {
      const answer = await explain(message.text, message.pageTitle, message.url);
      const record = {
        id: crypto.randomUUID(),
        text: message.text,
        answer,
        pageTitle: message.pageTitle,
        url: message.url,
        createdAt: Date.now()
      };
      const records = await getRecords();
      await chrome.storage.local.set({ paperlens_records: [record, ...records].slice(0, 1000) });

      if (sender.tab?.id) {
        chrome.tabs.sendMessage(sender.tab.id, {
          type: "PAPERLENS_RESULT",
          answer
        });
      }
    } catch (e) {
      if (sender.tab?.id) {
        chrome.tabs.sendMessage(sender.tab.id, {
          type: "PAPERLENS_RESULT",
          error: e instanceof Error ? e.message : "解释失败"
        });
      }
    }
  })();

  return true;
});

chrome.commands.onCommand.addListener(async (command) => {
  if (command !== "open-paperlens") return;
  const tabs = await chrome.tabs.query({active: true, currentWindow: true});
  const tab = tabs[0];
  if (!tab?.id) return;
  await chrome.tabs.sendMessage(tab.id, {type: "PAPERLENS_OPEN"});
});

async function callModel(model, system, user) {
  const response = await fetch(`${model.baseUrl.replace(/\/$/, "")}/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${model.apiKey}`
    },
    body: JSON.stringify({
      model: model.model,
      temperature: 0.3,
      messages: [
        { role: "system", content: system },
        { role: "user", content: user }
      ]
    })
  });

  if (!response.ok) {
    const detail = await response.text().catch(() => "");
    throw new Error(`API error: ${response.status} ${detail.slice(0, 300)}`);
  }
  const data = await response.json();
  return data.choices?.[0]?.message?.content || "";
}

const TREND_PROMPT = `你在帮一位关注 AI 前沿的研究生回顾今天读过的论文。根据下面的划词记录，按论文分组归纳：
每篇论文输出：
- 论文：<标题>
- 主题：一句话说明这篇论文在解决什么问题
- 关键概念：3-5 个，每个一句话解释
- 趋势看点：这篇论文反映了什么研究方向或趋势
最后加一段「今日趋势小结」（2-3 句）。
要求：用中文；归纳而非逐条翻译；只依据给定记录，不要编造论文里不存在的内容。`;

const ENGLISH_PROMPT = `你在帮一位英语学习者复习今天查过的内容。根据下面的划词记录整理成两类：
【生词】只列单词或固定短语，每个给出：单词 — 词性/音标 — 中文释义 — 一个例句
【难句】列查过的句子，每句给出：原句 — 结构解析（一句话）— 值得记住的表达
要求：用中文讲解；只整理记录中真实出现的内容，不要新增；某一类没有内容就写「无」。`;

async function buildDailyReport(records) {
  if (!records.length) return "今天还没有阅读记录。";

  const settings = await getSettings();
  if (!settings.apiKey) throw new Error("请先打开 PaperLens 设置并填写 API Key。");

  const material = records.slice(0, 80).map((r, i) =>
    `${i + 1}. [${r.pageTitle}] ${r.text}\n  释义：${r.answer.meaning}\n  文中：${r.answer.context}\n  要点：${r.answer.importance}`
  ).join("\n");

  const [trends, english] = await Promise.all([
    callModel(settings, TREND_PROMPT, material),
    callModel(settings, ENGLISH_PROMPT, material)
  ]);

  const date = new Date().toLocaleDateString("zh-CN");
  const papers = new Set(records.map((r) => r.pageTitle)).size;

  return [
    `PaperLens 每日回顾 · ${date}`,
    `共 ${records.length} 条记录 · ${papers} 篇论文`,
    "",
    "━━ 一、论文与 AI 趋势 ━━",
    trends.trim(),
    "",
    "━━ 二、英语学习 ━━",
    english.trim()
  ].join("\n");
}

async function pushToFeishu(webhookUrl, text) {
  const response = await fetch(webhookUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ msg_type: "text", content: { text } })
  });
  if (!response.ok) throw new Error(`推送失败：HTTP ${response.status}`);
  const data = await response.json().catch(() => ({}));
  const code = data.code ?? data.StatusCode;
  if (typeof code === "number" && code !== 0) {
    throw new Error(`飞书返回错误：${data.msg || JSON.stringify(data)}`);
  }
}

const DAILY_ALARM = "paperlens-daily-push";
const DAILY_HOUR = 21;

function scheduleDailyPush() {
  const next = new Date();
  next.setHours(DAILY_HOUR, 0, 0, 0);
  if (next.getTime() <= Date.now()) next.setDate(next.getDate() + 1);
  chrome.alarms.create(DAILY_ALARM, { when: next.getTime(), periodInMinutes: 1440 });
}

chrome.runtime.onInstalled.addListener(scheduleDailyPush);
chrome.runtime.onStartup.addListener(scheduleDailyPush);

chrome.alarms.onAlarm.addListener(async (alarm) => {
  if (alarm.name !== DAILY_ALARM) return;
  try {
    const settings = await getSettings();
    if (!settings.webhookUrl) return;

    const start = new Date();
    start.setHours(0, 0, 0, 0);
    const todayRecords = (await getRecords()).filter((r) => r.createdAt >= start.getTime());
    if (!todayRecords.length) return;

    await pushToFeishu(settings.webhookUrl, await buildDailyReport(todayRecords));
  } catch (e) {
    console.error("[PaperLens] 定时推送失败：", e);
  }
});
