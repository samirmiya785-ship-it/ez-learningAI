import { PDFParse } from "pdf-parse";
import { RecursiveCharacterTextSplitter } from "@langchain/textsplitters";

const textSplitter = new RecursiveCharacterTextSplitter({
  chunkSize: 1000,
  chunkOverlap: 200,
});

export async function extractTextFromPDF(fileBuffer, password) {
  const parseOptions = { data: fileBuffer };
  if (password) parseOptions.password = password;
  const parser = new PDFParse(parseOptions);
  const result = await parser.getText();
  const pdfData = result.text;

  if (!pdfData || pdfData.trim().length === 0) {
    throw new Error("No data found");
  }

  const cleanedText = pdfData
    .replace(/\r\n/g, "\n")
    .replace(/\n{2,}/g, "\n")
    .trim();

  return cleanedText;
}

export async function splitPdfText(pdfText) {
  if (!pdfText || pdfText.trim().length === 0) {
    throw new Error("No PDF text available to split");
  }

  return await textSplitter.splitText(pdfText);
}
