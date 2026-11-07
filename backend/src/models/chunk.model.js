import mongoose from "mongoose";
const chunkSchema = new mongoose.Schema({
    bookId: {
        type: mongoose.Schema.Types.ObjectId,
        required: [true, "Book id is required"],
        index: true,
        ref: "books"
    },
    subject: {
        type: String,
        required: [true, "Subject name is required"],
        index: true,
    },
    textChunk: {
        type: String,
        required: true
    },
    pageNumber: {
        type: Number,
    },
    embedding: {
        type: [Number],
        required: true
    },
},
{
    timestamps: true
})

const chunkModel = mongoose.model("chunks", chunkSchema)
export default chunkModel;