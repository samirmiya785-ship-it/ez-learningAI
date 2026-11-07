import "../config/loadEnv.js";
import { GoogleGenerativeAI } from "@google/generative-ai";

// text-embedding-004 is no longer available; gemini-embedding-001 is the
// current supported embedding model (3072-dimensional vectors).
const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY);
const embeddingsClient = genAI.getGenerativeModel({ model: "gemini-embedding-001" });

// Free-tier limit: 100 embed requests / minute.
// Process in batches of BATCH_SIZE with a cooldown between batches.
const BATCH_SIZE = 90;
const BATCH_DELAY_MS = 65_000; // 65 s — just over a minute to clear the window
const MAX_RETRIES = 3;

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function embedWithRetry(text, retries = 0) {
  try {
    const result = await embeddingsClient.embedContent({
      content: { role: "user", parts: [{ text }] },
    });
    return result.embedding.values;
  } catch (err) {
    const is429 = err?.message?.includes("429") || err?.status === 429;
    if (is429 && retries < MAX_RETRIES) {
      // Back off exponentially: 20 s, 40 s, 80 s
      const delay = 20_000 * Math.pow(2, retries);
      console.warn(`Gemini 429 — retrying in ${delay / 1000}s (attempt ${retries + 1}/${MAX_RETRIES})`);
      await sleep(delay);
      return embedWithRetry(text, retries + 1);
    }
    throw err;
  }
}

export async function generateEmbeddings(textChunks) {
  if (!textChunks || textChunks.length === 0) {
    throw new Error("No text chunks provided for embedding generation");
  }

  const allEmbeddings = [];

  for (let i = 0; i < textChunks.length; i += BATCH_SIZE) {
    const batch = textChunks.slice(i, i + BATCH_SIZE);
    const batchNum = Math.floor(i / BATCH_SIZE) + 1;
    const totalBatches = Math.ceil(textChunks.length / BATCH_SIZE);

    console.log(`Embedding batch ${batchNum}/${totalBatches} (${batch.length} chunks)…`);

    const batchEmbeddings = await Promise.all(batch.map((text) => embedWithRetry(text)));
    allEmbeddings.push(...batchEmbeddings);

    // Pause between batches (skip after the last one)
    if (i + BATCH_SIZE < textChunks.length) {
      console.log(`Batch ${batchNum} done — waiting ${BATCH_DELAY_MS / 1000}s before next batch…`);
      await sleep(BATCH_DELAY_MS);
    }
  }

  return allEmbeddings;
}
