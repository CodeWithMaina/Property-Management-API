import { Router } from "express";
import {
  createSubscriptionController,
  deleteSubscriptionController,
  getSubscriptionsController,
  getSubscriptionByIdController,
  updateSubscriptionController,
} from "./subscription.controller";

export const subscriptionRouter = Router();

subscriptionRouter.get("/subscriptions", getSubscriptionsController);
subscriptionRouter.get("/subscription/:id", getSubscriptionByIdController);
subscriptionRouter.post("/subscription", createSubscriptionController);
subscriptionRouter.put("/subscription/:id", updateSubscriptionController);
subscriptionRouter.delete("/subscription/:id", deleteSubscriptionController);