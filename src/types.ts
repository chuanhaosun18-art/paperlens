export type ReadingRecord = {
  id: string;
  text: string;
  answer: {
    meaning: string;
    context: string;
    importance: string;
    related: string[];
  };
  pageTitle: string;
  url: string;
  createdAt: number;
};

export type Settings = {
  apiKey: string;
  baseUrl: string;
  model: string;
  webhookUrl: string;
};