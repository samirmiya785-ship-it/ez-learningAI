import mongoose from "mongoose";

const userSchema = new mongoose.Schema({
    email: {
    type: String,
    required: [true, "Student's Email is required to register"],
    unique: [true, "Email address already exists"],
  },
  name: {
    type: String,
    required: [true, "Your full name is required"],
  },
  password: {
    type: String,
    required: [true, "Password is required to register"],
  },
})
const userModel = mongoose.model("user", userSchema);
export default userModel;