import { GoogleGenAI } from "@google/genai";

const apiKey = process.env.GEMINI_API_KEY;
if (!apiKey) {
  throw new Error("GEMINI_API_KEY env var is required");
}

// @google/genai v1.x — supports AQ. prefix keys from Google AI Studio.
// The old @google/generative-ai v0.24 only handled AIza... keys.
export const ai = new GoogleGenAI({ apiKey });

export const FLASH_MODEL = "gemini-2.5-flash";

export type ChatHistory = Array<{
  role: "user" | "model";
  parts: Array<{ text: string }>;
}>;

export function createChat(systemInstruction: string, history: ChatHistory) {
  return ai.chats.create({
    model: FLASH_MODEL,
    config: { systemInstruction, maxOutputTokens: 1500 },
    history,
  });
}
