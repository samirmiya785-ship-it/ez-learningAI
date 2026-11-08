import mongoose from "mongoose";
import { deleteChatHistory, getRecentHistory, saveMessages } from "../services/chatHistory.model.js";
import { buildRAGPrompt } from "../utilis/ragPrompt.js";
import { aimodel } from "../config/config.js";
import { searchSimilarChunks } from "../services/VectorSearch.service.js";

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

    failureStage = "retrieving relevant PDF chunks";
    const retrievedChunks = await searchSimilarChunks(normalizedQuery, 3);

    failureStage = "building the AI prompt";
    const { systemInstructions, userPrompt } = buildRAGPrompt({
      userQuestion: normalizedQuery,
      retrievedChunks,
      chatHistory: recentHistory,
    });

    failureStage = "generating the AI answer";
    const response = await aimodel.generateContent({
      contents: [
        {
          role: "user",
          parts: [{ text: userPrompt }],
        },
      ],
      systemInstruction: systemInstructions,
    });
    const aiAnswer = response.response.text();
    if (typeof aiAnswer !== "string" || !aiAnswer.trim()) {
      throw new Error("The AI model returned an empty answer");
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
      sources: retrievedChunks.map(({ _id, bookId, subject, pageNumber, score }) => ({
        chunkId: _id,
        bookId,
        subject,
        pageNumber,
        score,
      })),
    });
  } catch (error) {
    console.error("Chat query failed:", error);
    if (error?.status === 429 || error?.statusCode === 429) {
      return res.status(429).json({
        success: false,
        message: "The Gemini API usage quota has been reached. Please try again after the quota resets or review your Google AI Studio usage limits and billing.",
      });
    }

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
