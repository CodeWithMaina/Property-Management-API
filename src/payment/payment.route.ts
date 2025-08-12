import { Router } from "express";
import {
  createPaymentController,
  deletePaymentController,
  getPaymentByIdController,
  getPaymentsController,
  updatePaymentController,
  getPaymentsByLeaseController,
} from "./payment.controller";

export const paymentRouter = Router();

paymentRouter.get("/payments", getPaymentsController);
paymentRouter.get("/payment/:id", getPaymentByIdController);
paymentRouter.get("/payments/lease/:leaseId", getPaymentsByLeaseController);
paymentRouter.post("/payment", createPaymentController);
paymentRouter.put("/payment/:id", updatePaymentController);
paymentRouter.delete("/payment/:id", deletePaymentController);