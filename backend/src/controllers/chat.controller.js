import mongoose from "mongoose";
import { deleteChatHistory, getRecentHistory, saveMessages } from "../services/chatHistory.model.js";
import { buildRAGPrompt } from "../utilis/ragPrompt.js";
import { GEMINI_MODEL, genAI } from "../config/config.js";
import { searchSimilarChunks } from "../services/VectorSearch.service.js";
import { buildRetrievalQuery, classifyQuestionDomain } from "../services/ragQuery.service.js";

const NON_IT_RESPONSE = "IT ko kura sodha na hauu mw tesko lagi baneko hoo";
const NO_CONTEXT_RESPONSE = "Sorry yrr maile ta kei ni payena.";
const RAG_TOP_K = 5;

async function saveAndReturnFallback(res, sessionId, query, answer) {
  await saveMessages(sessionId, [
    { role: "user", content: query },
    { role: "assistant", content: answer },
  ]);
  return res.status(200).json({
    success: true,
    sessionId,
    answer,
    sources: [],
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
    const retrievedChunks = await searchSimilarChunks(retrievalQuery, RAG_TOP_K);
    const usableChunks = retrievedChunks.filter(
      (chunk) => typeof chunk?.textChunk === "string" && chunk.textChunk.trim(),
    );
    console.info("RAG retrieval completed", {
      hitCount: usableChunks.length,
      topScore: usableChunks[0]?.score ?? null,
    });
    if (usableChunks.length === 0) {
      return await saveAndReturnFallback(res, sessionId, normalizedQuery, NO_CONTEXT_RESPONSE);
    }

    failureStage = "building the AI prompt";
    const { systemInstructions, userPrompt } = buildRAGPrompt({
      userQuestion: normalizedQuery,
      retrievedChunks: usableChunks,
      chatHistory: recentHistory,
    });

    failureStage = "generating the AI answer";
    let response = await genAI.models.generateContent({
      model: GEMINI_MODEL,
      contents: userPrompt,
      config: {
        systemInstruction: systemInstructions,
        temperature: 0.0,
      },
    });
    let aiAnswer = response.text?.trim();
    if (typeof aiAnswer !== "string" || !aiAnswer.trim()) {
      throw new Error("The AI model returned an empty answer");
    }
    if (aiAnswer.toLocaleLowerCase() === NO_CONTEXT_RESPONSE.toLocaleLowerCase()) {
      console.warn("Gemini returned the no-context fallback despite retrieved excerpts; retrying with a partial-answer instruction", {
        retrievedChunkCount: usableChunks.length,
      });
      response = await genAI.models.generateContent({
        model: GEMINI_MODEL,
        contents: `${userPrompt}\n\nCorrection: retrieved textbook excerpts are present above. Do not return a no-information fallback. Give any answerable facts directly supported by those excerpts and identify only the specific details they do not contain.`,
        config: {
          systemInstruction: `${systemInstructions}\n\nThe controller has confirmed that non-empty textbook excerpts are present. You must not return a generic no-context fallback; answer supported portions and identify unsupported details.`,
          temperature: 0.0,
        },
      });
      aiAnswer = response.text?.trim();
      if (typeof aiAnswer !== "string" || !aiAnswer.trim()) {
        throw new Error("The AI model returned an empty answer after the grounded-answer retry");
      }
      if (aiAnswer.toLocaleLowerCase() === NO_CONTEXT_RESPONSE.toLocaleLowerCase()) {
        throw new Error("The AI model refused to answer despite non-empty retrieved textbook excerpts");
      }
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
      sources: usableChunks.map(({ _id, bookId, subject, pageNumber, score }) => ({
        chunkId: _id,
        bookId,
        subject,
        pageNumber,
        score,
      })),
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
