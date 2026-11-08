import "./loadEnv.js";
import { GoogleGenAI } from "@google/genai";

const config = {
  MONGO_URI: process.env.MONGO_URI,
  JWT_SECRET: process.env.JWT_SECRET,
  IMAGE_KIT_PRIVATE_KEY: process.env.IMAGE_KIT_PRIVATE_KEY,
  GOOGLE_API_KEY: process.env.GOOGLE_API_KEY,
};
export const genAI = new GoogleGenAI({ apiKey: config.GOOGLE_API_KEY });
export const GEMINI_MODEL = "gemini-3.6-flash";
export default config;
