import ChatModel from "../models/chats.model.js";
import mongoose from "mongoose";

export const saveMessages = async (sessionId, messages) => {
  if (typeof sessionId !== "string" || !mongoose.isValidObjectId(sessionId)) {
    throw new Error("Invalid input: 'sessionId' must be a valid ObjectId string");
  }
  if (!Array.isArray(messages) || messages.length === 0) {
    throw new Error("Invalid input: 'messages' must be a non-empty array");
  }

  const updatedChat = await ChatModel.findOneAndUpdate(
    { sessionId: new mongoose.Types.ObjectId(sessionId) },
    {
      $push: {
        messages: {
          $each: messages.map(({ role, content }) => ({
            role,
            content,
            timestamp: new Date(),
          })),
        },
      },
    },
    { new: true, upsert: true },
  );

  return updatedChat;
};

export const deleteChatHistory = async (sessionId) => {
  if (typeof sessionId !== "string" || !mongoose.isValidObjectId(sessionId)) {
    throw new Error("Invalid input: 'sessionId' must be a valid ObjectId string");
  }

  const result = await ChatModel.deleteOne({
    sessionId: new mongoose.Types.ObjectId(sessionId),
  });
  return { deleted: result.deletedCount > 0 };
};

export const saveMessage = async (sessionId, role, content) => saveMessages(sessionId, [{ role, content }]);

export const getRecentHistory = async (sessionId, limit = 10) => {
  if (typeof sessionId !== "string" || !mongoose.isValidObjectId(sessionId)) {
    throw new Error("Invalid input: 'sessionId' must be a valid ObjectId string");
  }
  if (!Number.isInteger(limit) || limit < 1) {
    throw new Error("Invalid input: 'limit' must be a positive integer");
  }

  const chat = await ChatModel.findOne({
    sessionId: new mongoose.Types.ObjectId(sessionId),
  });
  if (!chat || !Array.isArray(chat.messages)) {
    return [];
  }

  const recentMessages = chat.messages.slice(-limit);
  return recentMessages.map((msg) => ({
    role: msg.role,
    content: msg.content,
  }));
};
