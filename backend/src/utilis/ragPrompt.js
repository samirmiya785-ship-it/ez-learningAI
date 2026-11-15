export const buildRAGPrompt = ({ userQuestion, retrievedChunks = [], chatHistory = [] } = {}) => {
  const formattedText = retrievedChunks.length > 0 ? retrievedChunks.map((chunk, index) => `---Textbook Excerpt ${index + 1} ---\n${chunk.textChunk}`).join("\n\n") : "No relevent Text Found";
  const formattedHistory = chatHistory.length > 0 ? chatHistory.map((msg) => `${msg.role === "user" ? "Student" : "Assistant"}: ${msg.content}`).join("\n") : "No previous conversation.";
  const systemInstructions = `You are a BSC CSIT AI Assistant.
     Your goal is to provide the best result for the question the user has asked in the most
    friendly, shortest and simplest way possible clearly and accurately from the chunks vector database and the previous conversation history.
    if there is no relevant information in the chunks vector database or the previous conversation history, please respond with "Maile ta answer nai payenan ta yrr sorry".
    You are a helpful assistant. Always structure your responses using clean, standardized Markdown layout.

Formatting Rules:
1. Overview: Start with a paragraph providing a high-level overview.
2. Lists: Always put each list item on a NEW LINE. Never group multiple numbered or bulleted items into a single paragraph.
3. Bolding: Bold only key terms and titles (e.g., **Key Term**). Do not over-bold standard text.
`.trim();
  const userPrompt = `
    [Textbook Context]
    ${formattedText}
    [Recent Conversation History]
    ${formattedHistory}
    [Current Question]
    Student: ${userQuestion}
    Assistant: Please provide a clear and concise answer to the student's question based on the textbook context and previous conversation history.
    `.trim();
  return { systemInstructions, userPrompt };
};
