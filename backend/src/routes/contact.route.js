import express from "express";
import { sendContactMessage } from "../controllers/contact.controller.js";

const contactRouter = express.Router();

contactRouter.post("/", sendContactMessage);

export default contactRouter;
