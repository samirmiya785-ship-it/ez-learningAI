import BookModel from "../models/book.model.js";
import ChunkModel from "../models/chunk.model.js";
import { extractTextFromPDF, splitPdfText } from "../services/pdf.service.js";
import { processEmbeddings } from "../services/embedding.service.js";

export async function uploadPDF(req, res) {
  try {
    if (!req.file) {
      return res.status(400).json({ message: "No PDF file uploaded" });
    }
    
    const pdfText = await extractTextFromPDF(req.file.buffer, req.body.password);
    const chunks = await splitPdfText(pdfText);
    const vectors = await processEmbeddings(chunks);

    if (chunks.length !== vectors.length) {
      throw new Error("Embedding count does not match PDF chunk count");
    }

    const newBook = await BookModel.create({
      title: req.body.title || req.file.originalname,
      subject: req.body.subject || "General",
      fileKey: req.file.originalname,
      isReady: false,
    });

    await ChunkModel.insertMany(
      chunks.map((textChunk, index) => ({
        bookId: newBook._id,
        subject: newBook.subject,
        textChunk,
        embedding: vectors[index],
      }))
    );
    newBook.isReady = true;
    await newBook.save();

    return res.status(201).json({
      message: "PDF uploaded and processed successfully",
      bookId: newBook._id,
      chunkCount: chunks.length,
      embeddingCount: vectors.length,
    });
  } catch (error) {
    console.error("PDF upload failed:", error);
    return res.status(500).json({
      message: error.message || "PDF upload failed",
    });
  }
}
