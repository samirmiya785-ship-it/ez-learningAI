import mongoose from "mongoose";
import config from "./config.js";
import DNS from "dns";
DNS.setServers(["8.8.8.8"], ["8.8.4.4"])
async function connectDB() {
  await mongoose.connect(config.MONGO_URI);
  console.log("Connected to Database");
}
export default connectDB;

