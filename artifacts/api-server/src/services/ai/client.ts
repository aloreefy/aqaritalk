import { GoogleGenerativeAI } from "@google/generative-ai";

const apiKey = process.env.GEMINI_API_KEY;
if (!apiKey) {
  throw new Error("GEMINI_API_KEY env var is required");
}

export const genAI = new GoogleGenerativeAI(apiKey);

export const FLASH_MODEL = "gemini-1.5-flash";

export function getChatModel() {
  return genAI.getGenerativeModel({
    model: FLASH_MODEL,
    generationConfig: { maxOutputTokens: 8192 },
  });
}
