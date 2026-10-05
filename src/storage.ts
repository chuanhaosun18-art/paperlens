import type { ReadingRecord, Settings } from "./types";

const RECORDS = "paperlens_records";
const SETTINGS = "paperlens_settings";

const DEFAULT_SETTINGS: Settings = {
  apiKey: "",
  baseUrl: "https://api.openai.com/v1",
  model: "gpt-4.1-mini",
  webhookUrl: ""
};

export async function getRecords(): Promise<ReadingRecord[]> {
  const result = await chrome.storage.local.get(RECORDS);
  return result[RECORDS] ?? [];
}

export async function saveRecord(record: ReadingRecord) {
  const records = await getRecords();
  await chrome.storage.local.set({ [RECORDS]: [record, ...records].slice(0, 1000) });
}

export async function clearRecords() {
  await chrome.storage.local.remove(RECORDS);
}

export async function getSettings(): Promise<Settings> {
  const result = await chrome.storage.local.get(SETTINGS);
  return { ...DEFAULT_SETTINGS, ...(result[SETTINGS] ?? {}) };
}

export async function saveSettings(settings: Settings) {
  await chrome.storage.local.set({ [SETTINGS]: settings });
}