import express from "express";
import morgan from "morgan";
import cookieParser from "cookie-parser";
import userRouter from "./routes/user.route.js";
import pdfRouter from "./routes/pdf.route.js";
import chatRouter from "./routes/chat.route.js";
import contactRouter from "./routes/contact.route.js";
import cors from "cors";
const app = express();
app.use(
  cors({
    origin(origin, callback) {
      const allowedOrigins = [
        "http://localhost:5173",
        ...(process.env.FRONTEND_URL || "")
          .split(",")
          .map((value) => value.trim())
          .filter(Boolean),
      ];
      callback(null, !origin || allowedOrigins.includes(origin));
    },
    credentials: true,
  }),
);
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(morgan("dev"));
app.use(cookieParser());
app.use("/api/auth", userRouter);
app.use("/api/pdf", pdfRouter);
app.use("/api/chat", chatRouter);
app.use("/api/contact", contactRouter);
export default app;
