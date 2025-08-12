import { Router } from "express";
import {
  createBillingPlanController,
  deleteBillingPlanController,
  getBillingPlansController,
  getBillingPlanByIdController,
  updateBillingPlanController,
} from "./billingPlan.controller";

export const billingPlanRouter = Router();

billingPlanRouter.get("/billing-plans", getBillingPlansController);
billingPlanRouter.get("/billing-plan/:id", getBillingPlanByIdController);
billingPlanRouter.post("/billing-plan", createBillingPlanController);
billingPlanRouter.put("/billing-plan/:id", updateBillingPlanController);
billingPlanRouter.delete("/billing-plan/:id", deleteBillingPlanController);