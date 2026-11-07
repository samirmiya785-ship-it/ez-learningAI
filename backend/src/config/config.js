import "./loadEnv.js";
import { GoogleGenerativeAI } from '@google/generative-ai';

const config = {
  MONGO_URI: process.env.MONGO_URI,
  JWT_SECRET: process.env.JWT_SECRET,
  IMAGE_KIT_PRIVATE_KEY: process.env.IMAGE_KIT_PRIVATE_KEY,
  GOOGLE_API_KEY: process.env.GOOGLE_API_KEY,
};
const genAI = new GoogleGenerativeAI(config.GOOGLE_API_KEY);
export const aimodel = genAI.getGenerativeModel({
  model: 'gemini-3.6-flash'
})
export default config;
