import ChunkModel from "../models/chunk.model.js";
import { generateEmbeddings } from "../utilis/embeddings.js";

export const searchSimilarChunks = async (text, topK = 4, filter = {}) => {
  if (!text || typeof text !== "string") {
    throw new Error("Invalid input: 'text' must be a non-empty string");
  }
  if (!Number.isInteger(topK) || topK < 1) {
    throw new Error("Invalid input: 'topK' must be a positive integer");
  }

  const queryVector = (await generateEmbeddings([text]))[0];
  if (!queryVector || queryVector.length === 0) {
    throw new Error("Embedding generation returned an empty query vector");
  }

  const searchResults = await ChunkModel.aggregate([
    {
      $vectorSearch: {
        index: "ez-learningAI",
        path: "embedding",
        queryVector,
        numCandidates: topK * 10,
        limit: topK,
        filter,
      },
    },
    {
      $project: {
        _id: 1,
        bookId: 1,
        subject: 1,
        textChunk: 1,
        pageNumber: 1,
        score: { $meta: "vectorSearchScore" },
      },
    },
  ]);

  return searchResults;
};
