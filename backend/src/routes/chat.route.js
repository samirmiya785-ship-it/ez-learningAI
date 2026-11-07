import express from "express";
import * as chatController from "../controllers/chat.controller.js";
const { deleteChat, handleQuery } = chatController;

const router = express.Router();

router.post("/query", handleQuery);
router.delete("/:sessionId", deleteChat);

export default router;
