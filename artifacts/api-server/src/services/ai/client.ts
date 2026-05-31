import { GoogleGenerativeAI } from "@google/generative-ai";

const apiKey = process.env.GEMINI_API_KEY;
if (!apiKey) {
  throw new Error("GEMINI_API_KEY env var is required");
}

export const genAI = new GoogleGenerativeAI(apiKey);

// gemini-2.0-flash on v1beta:
//   - systemInstruction at getGenerativeModel level works (camelCase accepted by v1beta)
//   - gemini-1.5-flash is 404 on v1beta; v1 rejects camelCase systemInstruction
export const FLASH_MODEL = "gemini-2.0-flash";
