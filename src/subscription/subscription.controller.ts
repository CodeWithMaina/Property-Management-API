import { Request, Response } from "express";
import {
  getSubscriptionsService,
  getSubscriptionByIdService,
  createSubscriptionService,
  updateSubscriptionService,
  deleteSubscriptionService,
} from "./subscription.service";
import { NewSubscription } from "../drizzle/schema";
import { subscriptionUpdateSchema } from "./subscription.schema";

export const getSubscriptionsController = async (req: Request, res: Response) => {
  try {
    const subscriptions = await getSubscriptionsService();
    if (subscriptions == null || subscriptions.length === 0) {
      res.status(404).json({ message: "No subscriptions found" });
      return;
    }
    res.status(200).json(subscriptions);
  } catch (error: any) {
    res.status(500).json({
      message: "Failed to fetch subscriptions",
      error: error.message,
    });
  }
};

export const getSubscriptionByIdController = async (req: Request, res: Response) => {
  try {
    const subscriptionId = req.params.id;
    if (!subscriptionId) {
      res.status(400).json({ message: "Invalid subscription ID" });
      return;
    }

    const subscription = await getSubscriptionByIdService(subscriptionId);
    if (!subscription) {
      res.status(404).json({ message: "Subscription not found" });
      return;
    }
    res.status(200).json(subscription);
  } catch (error: any) {
    res.status(500).json({
      message: "Failed to fetch subscription",
      error: error.message,
    });
  }
};

export const createSubscriptionController = async (req: Request, res: Response) => {
  try {
    const subscriptionData: NewSubscription = req.body;
    if (!subscriptionData.userId || !subscriptionData.planId || !subscriptionData.startDate) {
      res.status(400).json({ message: "Missing required fields" });
      return;
    }

    const newSubscription = await createSubscriptionService(subscriptionData);
    res.status(201).json(newSubscription);
  } catch (error: any) {
    res.status(500).json({
      message: "Failed to create subscription",
      error: error.message,
    });
  }
};

export const updateSubscriptionController = async (req: Request, res: Response) => {
  try {
    const subscriptionId = req.params.id;
    if (!subscriptionId) {
      res.status(400).json({ message: "Invalid subscription ID" });
      return;
    }

    const parsed = subscriptionUpdateSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({
        message: "Validation failed",
        errors: parsed.error.flatten().fieldErrors,
      });
      return;
    }

    const filteredData = parsed.data;
    const updatedSubscription = await updateSubscriptionService(subscriptionId, filteredData);
    
    if (!updatedSubscription) {
      res.status(404).json({ message: "Subscription not found" });
      return;
    }

    res.status(200).json(updatedSubscription);
  } catch (error: any) {
    res.status(500).json({
      message: "Failed to update subscription",
      error: error.message,
    });
  }
};

export const deleteSubscriptionController = async (req: Request, res: Response) => {
  try {
    const subscriptionId = req.params.id;
    if (!subscriptionId) {
      res.status(400).json({ message: "Invalid subscription ID" });
      return;
    }

    const deletedSubscription = await deleteSubscriptionService(subscriptionId);
    if (!deletedSubscription) {
      res.status(404).json({ message: "Subscription not found" });
      return;
    }
    res.status(200).json({ message: "Subscription deleted successfully" });
  } catch (error: any) {
    res.status(500).json({
      message: "Failed to delete subscription",
      error: error.message,
    });
  }
};