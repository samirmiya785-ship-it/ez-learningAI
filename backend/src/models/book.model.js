import mongoose from "mongoose";

const bookSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, "Book Title is Required"],
      trim: true,
    },
    subject: {
      type: String,
      required: [true, "Subject Name is required"],
      trim: true,
      index: true,
    },
    semester: {
      type: Number,
      required: [true, "Semester is required"],
      default: 1,
    },
    fileKey: {
      type: String,
      required: [true, "filekey is required"],
    },
    isReady: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  },
);
const bookModel = mongoose.model("books", bookSchema);
export default bookModel;
