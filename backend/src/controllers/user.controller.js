import userModel from "../models/user.model.js";
import sessionModel from "../models/session.model.js"
import jwt from "jsonwebtoken";
import crypto from "node:crypto";
import config from "../config/config.js";

export async function register(req, res){
    const {email, name, password} = req.body;
    if (
        typeof email !== "string" ||
        !email.trim() ||
        typeof name !== "string" ||
        !name.trim() ||
        typeof password !== "string" ||
        !password
    ) {
        return res.status(400).json({
            message: "Email, name, and password are required",
        });
    }
    const isAlreadyExists = await userModel.findOne({
        $or: [{email: email.trim()}, {name: name.trim()}],
    })
    if(isAlreadyExists){
        return res.status(409).json({
            message: "User already exists"
        })
    }
    const hashedPassword = crypto.createHash("sha256").update(password).digest("hex")
    const user = await userModel.create({
        email: email.trim(),
        name: name.trim(),
        password: hashedPassword
    })
    res.status(201).json({
        message: "User Registered Successfully",
        user: {
            name: user.name,
            email: user.email
        }
    })
}
export async function login(req,res){
    const {email, password} = req.body;
    if (typeof email !== "string" || typeof password !== "string" || !password) {
        return res.status(400).json({
            message: "Email and password are required",
        });
    }
    const user = await userModel.findOne({email: email.trim()})
    if(!user){
        return res.status(404).json({
            message: "User doesnot exists"
        })
    }
    const hashedPassword = crypto.createHash("sha256").update(password).digest("hex");
    const isValidPassword = hashedPassword === user.password;
    if(!isValidPassword){
        return res.status(401).json({
            message: "Invalid Password"
        })
    }
    const refreshToken = jwt.sign({
        id: user._id,
    },
    config.JWT_SECRET,{
        expiresIn: "7d"
    },
)
const hashRefreshToken = crypto.createHash("sha256").update(refreshToken).digest("hex");
const session = await sessionModel.create({
    user: user._id,
    refreshToken: hashRefreshToken,
    ip: req.ip,
    userAgent: req.get("user-agent"),
}) ;
const accessToken = jwt.sign({
    id: user._id,
    sessionId: session._id
    }, config.JWT_SECRET,{
    expiresIn: "10m"
})
  res.cookie("refreshToken", refreshToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    maxAge: 7 * 24 * 60 * 60 * 1000,
  });
  res.status(200).json({
    message: "User logged in Successful",
    user: {
      name: user.name,
      email: user.email,
    },
    accessToken,
  });
}
export async function getMe(req, res) {
  const token = req.headers.authorization?.split(" ")[1];
  if (!token) {
    return res.status(401).json({ message: "token not found" });
  }
  try {
    const decoded = jwt.verify(token, config.JWT_SECRET);
    const user = await userModel.findById(decoded.id);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }
    return res.status(200).json({
      message: "User fetched Successfully",
      user: {
        name: user.name,
      },
    });
  } catch (error) {
    if (error instanceof jwt.JsonWebTokenError) {
      return res.status(401).json({ message: "invalid Token" });
    }
    throw error;
  }
}
export async function refreshToken(req, res) {
  const refreshToken = req.cookies.refreshToken;
  if (!refreshToken) {
    return res.status(401).json({ message: "Refresh token not found" });
  }
  try {
    const decoded = jwt.verify(refreshToken, config.JWT_SECRET);
    const tokenHash = crypto.createHash("sha256").update(refreshToken).digest("hex");
    const session = await sessionModel.findOne({
      user: decoded.id,
      refreshToken: tokenHash,
      revoked: false,
    });
    if (!session) {
      return res.status(401).json({ message: "Invalid refresh token" });
    }

    const newRefreshToken = jwt.sign(
      { id: decoded.id },
      config.JWT_SECRET,
      { expiresIn: "7d" },
    );
    session.refreshToken = crypto.createHash("sha256").update(newRefreshToken).digest("hex");
    await session.save();

    const accessToken = jwt.sign(
      { id: decoded.id, sessionId: session._id },
      config.JWT_SECRET,
      { expiresIn: "15m" },
    );
    res.cookie("refreshToken", newRefreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });
    return res.status(200).json({
      message: "Access token refreshed successfully",
      accessToken,
    });
  } catch (error) {
    if (error instanceof jwt.JsonWebTokenError) {
      return res.status(401).json({ message: "Invalid refresh token" });
    }
    throw error;
  }
}
export async function logout(req, res) {
  const refreshToken = req.cookies.refreshToken;
  if (!refreshToken) {
    return res.status(400).json({ message: "Refresh Token not found" });
  }
  const hashrefreshToken = crypto.createHash("sha256").update(refreshToken).digest("hex");
  const session = await sessionModel.findOne({
    refreshToken: hashrefreshToken,
    revoked: false,
  });
  if (!session) {
    return res.status(400).json({ message: "Session not found" });
  }
  session.revoked = true;
  await session.save();
  res.clearCookie("refreshToken");
  res.status(200).json({
    message: "Logged out Successful",
  });
}
export async function logoutAll(req, res) {
  const refreshToken = req.cookies.refreshToken;
  if (!refreshToken) {
    return res.status(400).json({ message: "Refresh Token not Found" });
  }
  try {
    const decoded = jwt.verify(refreshToken, config.JWT_SECRET);
    await sessionModel.updateMany(
      {
        user: decoded.id,
        revoked: false,
      },
      {
        revoked: true,
      },
    );
    res.clearCookie("refreshToken");
    return res.status(200).json({
      message: "Logged out from all devices",
    });
  } catch (error) {
    if (error instanceof jwt.JsonWebTokenError) {
      return res.status(401).json({ message: "Invalid refresh token" });
    }
    throw error;
  }
}