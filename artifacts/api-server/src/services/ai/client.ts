import { GoogleGenerativeAI } from "@google/generative-ai";

const apiKey = process.env.GEMINI_API_KEY;
if (!apiKey) {
  throw new Error("GEMINI_API_KEY env var is required");
}

export const genAI = new GoogleGenerativeAI(apiKey);

// gemini-1.5-flash on v1beta works with systemInstruction at model level.
// gemini-2.0-flash requires paid quota even on AI Studio free-tier projects.
// gemini-1.5-flash free tier: 15 RPM, 1M TPM, 1500 req/day.
export const FLASH_MODEL = "gemini-1.5-flash";

export function getModel(systemInstruction: string) {
  return genAI.getGenerativeModel({ model: FLASH_MODEL, systemInstruction });
}
