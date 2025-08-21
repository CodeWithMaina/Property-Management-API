// auth.controller.ts
import { Request, Response, RequestHandler } from "express";
import {
  createUserServices,
  getUserByEmailService,
  updateUserPasswordService,
  getUserByIdServices,
} from "./auth.service";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { sendNotificationEmail } from "../middleware/googleMailer";
import { z } from "zod";
import { createUserSchema, loginSchema } from "./auth.schema";

export const createUser: RequestHandler = async (
  req: Request,
  res: Response
) => {
  try {
    // Validate input
    const validatedData = createUserSchema.parse(req.body);
    const userEmail = validatedData.email;

    const existingUser = await getUserByEmailService(userEmail);
    if (existingUser) {
      return res.status(400).json({ error: "User with this email already exists" });
    }

    // Generate hashed password
    const salt = bcrypt.genSaltSync(10);
    const hashedPassword = bcrypt.hashSync(validatedData.password, salt);

    // Create user object with hashed password
    const userData = {
      name: validatedData.name,
      email: validatedData.email,
      phone: validatedData.phone || "",
      passwordHash: hashedPassword,
      role: validatedData.role,
    };

    // Call the service to create the user
    const newUser = await createUserServices(userData);
    
    // Send welcome email
    try {
      const results = await sendNotificationEmail(
        validatedData.email,
        validatedData.name,
        "Account created successfully",
        "Welcome to our property management system</b>"
      );
      console.log("Email sent successfully:", results);
    } catch (emailError) {
      console.error("Failed to send notification email:", emailError);
      // Don't fail the request if email fails
    }

    // Remove password from response
    const { passwordHash: _, ...userWithoutPassword } = newUser;
    
    return res.status(201).json(userWithoutPassword);
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.errors });
    }
    console.error("Create user error:", error);
    return res.status(500).json({ error: error.message || "Failed to create user" });
  }
};

// Login User
export const loginUser: RequestHandler = async (
  req: Request,
  res: Response
) => {
  try {
    const validatedData = loginSchema.parse(req.body);
    const { email, password } = validatedData;

    const user = await getUserByEmailService(email);

    if (!user) {
      return res.status(401).json({ error: "Invalid email or password" });
    }

    // Compare passwords
    const isMatch = bcrypt.compareSync(password, user.passwordHash);
    if (!isMatch) {
      return res.status(401).json({ error: "Invalid email or password" });
    }

    // Generate a token
    const payload = {
      userName: user.name,
      userId: user.id,
      email: user.email,
      role: user.role,
      exp: Math.floor(Date.now() / 1000) + 60 * 60, // Token expires in 1 hour
    };

    const secret = process.env.JWT_SECRET as string;
    if (!secret) {
      throw new Error("JWT_SECRET is not configured");
    }

    const token = jwt.sign(payload, secret);

    return res.status(200).json({
      token,
      userName: user.name,
      userId: user.id,
      email: user.email,
      role: user.role,
    });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.errors });
    }
    console.error("Login error:", error);
    return res.status(500).json({ error: error.message || "Failed to login user" });
  }
};

export const passwordReset: RequestHandler = async (
  req: Request,
  res: Response
) => {
  try {
    const { email } = req.body;
    if (!email) {
      return res.status(400).json({ error: "Email is required" });
    }

    const user = await getUserByEmailService(email);
    if (!user) {
      // Don't reveal if user exists for security
      return res.status(200).json({ message: "If the email exists, a reset link has been sent" });
    }

    if (!process.env.JWT_SECRET) {
      throw new Error("JWT_SECRET is not configured");
    }

    const resetToken = jwt.sign(
      { userId: user.id, email: user.email },
      process.env.JWT_SECRET,
      { expiresIn: "1h" }
    );

    const resetLink = `http://localhost:5000/api/reset/${resetToken}`;
    
    try {
      const emailResult = await sendNotificationEmail(
        email,
        "Password Reset",
        user.name,
        `Click the link to reset your password: <a href="${resetLink}">Reset Password</a>`
      );
      console.log("Password reset email sent successfully to:", email);
    } catch (emailError) {
      console.error("Failed to send reset email:", emailError);
      return res.status(500).json({ error: "Failed to send reset email" });
    }

    return res.status(200).json({
      message: "Password reset email sent successfully",
    });
  } catch (error: any) {
    console.error("Password reset error:", error);
    return res.status(500).json({
      error: error.message || "Failed to reset password",
    });
  }
};

export const updatePassword: RequestHandler = async (
  req: Request,
  res: Response
) => {
  try {
    const { token } = req.params;
    const { password } = req.body;

    if (!token) {
      return res.status(400).json({ error: "Token is required" });
    }

    if (!password) {
      return res.status(400).json({ error: "Password is required" });
    }

    const secret = process.env.JWT_SECRET as string;
    if (!secret) {
      throw new Error("JWT_SECRET is not configured");
    }

    const payload: any = jwt.verify(token, secret);

    // Fetch user by ID from token
    const user = await getUserByIdServices(payload.userId);
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    // Verify email matches (additional security)
    if (user.email !== payload.email) {
      return res.status(400).json({ error: "Invalid token" });
    }

    const salt = bcrypt.genSaltSync(10);
    const hashedPassword = bcrypt.hashSync(password, salt);

    // Update password
    await updateUserPasswordService(user.email, hashedPassword);

    // Send confirmation email
    try {
      await sendNotificationEmail(
        user.email,
        "Password Reset Successfully",
        user.name,
        "Your password has been reset successfully"
      );
    } catch (emailError) {
      console.error("Failed to send confirmation email:", emailError);
      // Don't fail the request if email fails
    }

    return res.status(200).json({ message: "Password has been reset successfully" });
  } catch (error: any) {
    console.error("Update password error:", error);
    if (error.name === "TokenExpiredError") {
      return res.status(400).json({ error: "Token has expired" });
    }
    if (error.name === "JsonWebTokenError") {
      return res.status(400).json({ error: "Invalid token" });
    }
    return res.status(500).json({ error: error.message || "Failed to reset password" });
  }
};