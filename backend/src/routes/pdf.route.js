import express from "express";
import multer from "multer";
import { uploadPDF } from "../controllers/book.controller.js";

const pdfRouter = express.Router();
const storage = multer.memoryStorage();
const upload = multer({ storage });

pdfRouter.post("/upload", upload.single("pdf"), uploadPDF);

export default pdfRouter;
