import express from "express";
import * as userController from "../controllers/user.controller.js"

const userRouter = express.Router();

userRouter.post("/register", userController.register);
userRouter.post("/login", userController.login);
userRouter.get("/getme", userController.getMe);
userRouter.get("/refreshToken", userController.refreshToken);
userRouter.post("/logout", userController.logout);
userRouter.post("/logoutAll", userController.logoutAll);
export default userRouter;