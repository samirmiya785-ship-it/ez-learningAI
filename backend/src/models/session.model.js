import mongoose from "mongoose";
const sessionSchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        required: [true, "User is required"],
        ref: "user",
    },
    userAgent: {
        type: String,
    },
     refreshToken: {
          type: String,
          required: [true, "Refresh Token is Required"],
        },
        ip: {
          type: String,
          required: [true, "IP is required"],
        },
        revoked: {
          type: Boolean,
          default: false,
        },
      },
      {
        timestamps: true,
      },
    );
const sessionModel = mongoose.model("session", sessionSchema);
export default sessionModel;
