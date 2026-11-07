import mongoose from "mongoose";

const messageSchema = new mongoose.Schema({
    role: {
        type: String,
        required: [true, "Role is required"],
        enum: ["user", "assistant", "system"]
    },
    content: {
        type: String,
        required: [true, "Content is required"]
    },
    timestamp: {
        type: Date,
        default: Date.now
    }
});
const chatSchema = new mongoose.Schema({
    sessionId: {
        type: mongoose.Schema.Types.ObjectId,   
        required: [true, "Session id is required"],
        index: true,
        unique: true,
    },  
    messages: [messageSchema],
},
{timestamps: true}
)
const ChatModel = mongoose.model("chats", chatSchema);
export default ChatModel;
    