import { Router } from "express";
import {
  createUserController,
  deleteUserController,
  getUserByIdController,
  getUsersController,
  updateUserController,
} from "./user.controller";

export const userRouter = Router();

userRouter.get("/users", getUsersController);
userRouter.get("/user/:id", getUserByIdController);
userRouter.post("/user", createUserController);
userRouter.put("/user/:id", updateUserController);
userRouter.delete("/user/:id", deleteUserController);