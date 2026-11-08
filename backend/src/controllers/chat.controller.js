import mongoose from "mongoose";
import { deleteChatHistory, getRecentHistory, saveMessages } from "../services/chatHistory.model.js";
import { GEMINI_MODEL, genAI } from "../config/config.js";
import { searchSimilarChunks } from "../services/VectorSearch.service.js";
import { buildRetrievalQuery, classifyQuestionDomain } from "../services/ragQuery.service.js";
import { generateGroundedAnswer } from "../services/groundedAnswer.service.js";

const NON_IT_RESPONSE = "IT ko kura sodha na hauu mw tesko lagi baneko hoo";
const NO_CONTEXT_RESPONSE = "Sorry yrr maile ta kei ni payena.";
const UNVERIFIED_RESPONSE = "I found course excerpts, but could not verify an answer from them. Try rephrasing your question or check the listed sources.";
const RAG_TOP_K = 5;

function formatSources(chunks, excerptNumbers = chunks.map((_, index) => index + 1)) {
  return chunks.map(({ _id, bookId, subject, pageNumber, score }, index) => ({
    chunkId: _id,
    bookId,
    subject,
    pageNumber,
    score,
    excerptNumber: excerptNumbers[index],
  }));
}

async function saveAndReturnFallback(res, sessionId, query, answer, sources = []) {
  await saveMessages(sessionId, [
    { role: "user", content: query },
    { role: "assistant", content: answer },
  ]);
  return res.status(200).json({
    success: true,
    sessionId,
    answer,
    sources,
  });
}

export const deleteChat = async (req, res) => {
  const { sessionId } = req.params;
  if (typeof sessionId !== "string" || !mongoose.isValidObjectId(sessionId)) {
    return res.status(400).json({
      success: false,
      message: "A valid sessionId is required",
    });
  }

  try {
    const result = await deleteChatHistory(sessionId);
    return res.status(200).json({ success: true, sessionId, ...result });
  } catch (error) {
    console.error("Chat deletion failed:", error);
    return res.status(500).json({
      success: false,
      message: "Unable to delete chat history",
    });
  }
};

export const handleQuery = async (req, res) => {
  const { sessionId, query } = req.body ?? {};
  if (typeof sessionId !== "string" || !mongoose.isValidObjectId(sessionId) || typeof query !== "string" || !query.trim()) {
    return res.status(400).json({
      success: false,
      message: "A valid sessionId and a non-empty query are required",
    });
  }
  let failureStage = "loading conversation history";
  try {
    const normalizedQuery = query.trim();
    const recentHistory = await getRecentHistory(sessionId, 6);

    failureStage = "classifying the question domain";
    const domain = await classifyQuestionDomain({
      genAI,
      model: GEMINI_MODEL,
      userQuestion: normalizedQuery,
      chatHistory: recentHistory,
    });
    if (domain === "non_it") {
      return await saveAndReturnFallback(res, sessionId, normalizedQuery, NON_IT_RESPONSE);
    }

    failureStage = "preparing the retrieval query";
    const retrievalQuery = await buildRetrievalQuery({
      genAI,
      model: GEMINI_MODEL,
      userQuestion: normalizedQuery,
      chatHistory: recentHistory,
    });

    failureStage = "retrieving relevant PDF chunks";
    const retrievalQueries = [...new Set([normalizedQuery, retrievalQuery])];
    const retrievalResults = await Promise.all(
      retrievalQueries.map((searchQuery) => searchSimilarChunks(searchQuery, RAG_TOP_K)),
    );
    const chunksById = new Map();
    for (const chunk of retrievalResults.flat()) {
      const key = String(chunk._id);
      const existing = chunksById.get(key);
      if (!existing || (chunk.score ?? 0) > (existing.score ?? 0)) {
        chunksById.set(key, chunk);
      }
    }
    const retrievedChunks = [...chunksById.values()]
      .sort((left, right) => (right.score ?? 0) - (left.score ?? 0))
      .slice(0, RAG_TOP_K);
    const usableChunks = retrievedChunks.filter(
      (chunk) => typeof chunk?.textChunk === "string" && chunk.textChunk.trim(),
    );
    console.info("RAG retrieval completed", {
      hitCount: usableChunks.length,
      topScore: usableChunks[0]?.score ?? null,
      retrievalQueryCount: retrievalQueries.length,
    });
    if (usableChunks.length === 0) {
      return await saveAndReturnFallback(res, sessionId, normalizedQuery, NO_CONTEXT_RESPONSE);
    }

    failureStage = "generating and verifying a grounded answer";
    const { answer: aiAnswer, excerptIndexes } = await generateGroundedAnswer({
      genAI,
      model: GEMINI_MODEL,
      userQuestion: normalizedQuery,
      retrievedChunks: usableChunks,
    });
    if (!aiAnswer) {
      console.warn("No answer claims passed quote and entailment verification", {
        retrievedChunkCount: usableChunks.length,
      });
      return await saveAndReturnFallback(
        res,
        sessionId,
        normalizedQuery,
        UNVERIFIED_RESPONSE,
        formatSources(usableChunks),
      );
    }

    failureStage = "saving the conversation";
    await saveMessages(sessionId, [
      { role: "user", content: normalizedQuery },
      { role: "assistant", content: aiAnswer },
    ]);

    return res.status(200).json({
      success: true,
      sessionId,
      answer: aiAnswer,
      sources: formatSources(
        excerptIndexes.map((index) => usableChunks[index]),
        excerptIndexes.map((index) => index + 1),
      ),
    });
  } catch (error) {
    console.error("Chat query failed:", error);
    const responseBody = {
      success: false,
      message: "Unable to process chat query",
    };
    if (process.env.NODE_ENV !== "production") {
      responseBody.stage = failureStage;
      responseBody.error = error instanceof Error ? error.message : String(error);
    }
    return res.status(500).json({
      ...responseBody,
    });
  }
};
