import { generateEmbeddings } from "../utilis/embeddings.js";

export async function processEmbeddings(textArray) {
  if (!textArray || textArray.length === 0) {
    throw new Error("No text chunks provided for embedding generation");
  }

  return await generateEmbeddings(textArray);
}
