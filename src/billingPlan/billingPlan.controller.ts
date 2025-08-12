import { Request, Response } from "express";
import {
  getBillingPlansService,
  getBillingPlanByIdService,
  createBillingPlanService,
  updateBillingPlanService,
  deleteBillingPlanService,
} from "./billingPlan.service";
import { NewBillingPlan } from "../drizzle/schema";
import { billingPlanUpdateSchema } from "./billingPlan.schema";

export const getBillingPlansController = async (req: Request, res: Response) => {
  try {
    const billingPlans = await getBillingPlansService();
    if (billingPlans == null || billingPlans.length === 0) {
      res.status(404).json({ message: "No billing plans found" });
      return;
    }
    res.status(200).json(billingPlans);
  } catch (error: any) {
    res.status(500).json({
      message: "Failed to fetch billing plans",
      error: error.message,
    });
  }
};

export const getBillingPlanByIdController = async (req: Request, res: Response) => {
  try {
    const billingPlanId = req.params.id;
    if (!billingPlanId) {
      res.status(400).json({ message: "Invalid billing plan ID" });
      return;
    }

    const billingPlan = await getBillingPlanByIdService(billingPlanId);
    if (!billingPlan) {
      res.status(404).json({ message: "Billing plan not found" });
      return;
    }
    res.status(200).json(billingPlan);
  } catch (error: any) {
    res.status(500).json({
      message: "Failed to fetch billing plan",
      error: error.message,
    });
  }
};

export const createBillingPlanController = async (req: Request, res: Response) => {
  try {
    const billingPlanData: NewBillingPlan = req.body;
    if (!billingPlanData.name || !billingPlanData.price || !billingPlanData.maxProperties) {
      res.status(400).json({ message: "Missing required fields" });
      return;
    }

    const newBillingPlan = await createBillingPlanService(billingPlanData);
    res.status(201).json(newBillingPlan);
  } catch (error: any) {
    if (error.code === '23505') {
      res.status(409).json({
        message: "Billing plan name already exists",
        error: "name_taken",
      });
      return;
    }
    res.status(500).json({
      message: "Failed to create billing plan",
      error: error.message,
    });
  }
};

export const updateBillingPlanController = async (req: Request, res: Response) => {
  try {
    const billingPlanId = req.params.id;
    if (!billingPlanId) {
      res.status(400).json({ message: "Invalid billing plan ID" });
      return;
    }

    const parsed = billingPlanUpdateSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({
        message: "Validation failed",
        errors: parsed.error.flatten().fieldErrors,
      });
      return;
    }

    const filteredData = parsed.data;
    const updatedBillingPlan = await updateBillingPlanService(billingPlanId, filteredData);
    
    if (!updatedBillingPlan) {
      res.status(404).json({ message: "Billing plan not found" });
      return;
    }

    res.status(200).json(updatedBillingPlan);
  } catch (error: any) {
    if (error.code === '23505') {
      res.status(409).json({
        message: "Billing plan name already exists",
        error: "name_taken",
      });
      return;
    }
    res.status(500).json({
      message: "Failed to update billing plan",
      error: error.message,
    });
  }
};

export const deleteBillingPlanController = async (req: Request, res: Response) => {
  try {
    const billingPlanId = req.params.id;
    if (!billingPlanId) {
      res.status(400).json({ message: "Invalid billing plan ID" });
      return;
    }

    const deletedBillingPlan = await deleteBillingPlanService(billingPlanId);
    if (!deletedBillingPlan) {
      res.status(404).json({ message: "Billing plan not found" });
      return;
    }
    res.status(200).json({ message: "Billing plan deleted successfully" });
  } catch (error: any) {
    res.status(500).json({
      message: "Failed to delete billing plan",
      error: error.message,
    });
  }
};