// src/modules/invoice/invoice.routes.ts
import { Router } from "express";
import {
  getInvoices,
  createInvoice,
  getInvoiceById,
  updateInvoice,
  updateInvoiceStatus,
  voidInvoice,
  addInvoiceItem,
  updateInvoiceItem,
  removeInvoiceItem,
  batchGenerateInvoices,
  generateLeaseInvoice,
  issueInvoice,
  sendInvoiceReminder,
  getLeaseInvoices,
} from "./invoice.controller";

const invoiceRoutes = Router();

// GET /invoices - List all invoices (filterable by status, lease, organization)
invoiceRoutes.get("/", getInvoices);

// POST /invoices - Create a new, manual invoice
invoiceRoutes.post("/", createInvoice);

// GET /invoices/:id - Get specific invoice details
invoiceRoutes.get("/:id", getInvoiceById);

// PUT /invoices/:id - Update invoice details
invoiceRoutes.put("/:id", updateInvoice);

// PATCH /invoices/:id/status - Update invoice status
invoiceRoutes.patch("/:id/status", updateInvoiceStatus);

// POST /invoices/:id/void - Void an invoice
invoiceRoutes.post("/:id/void", voidInvoice);

// POST /invoices/:id/items - Add line items to an invoice
invoiceRoutes.post("/:id/items", addInvoiceItem);

// PUT /invoices/:id/items/:itemId - Update an invoice line item
invoiceRoutes.put("/:id/items/:itemId", updateInvoiceItem);

// DELETE /invoices/:id/items/:itemId - Remove an invoice line item
invoiceRoutes.delete("/:id/items/:itemId", removeInvoiceItem);

// POST /invoices/generate - Admin/System: Batch-generate monthly invoices for all active leases
invoiceRoutes.post("/generate", batchGenerateInvoices);

// PATCH /invoices/:id/issue - Transition an invoice from 'draft' to 'issued'
invoiceRoutes.patch("/:id/issue", issueInvoice);

// POST /invoices/:id/reminders - Send a payment reminder for an invoice
invoiceRoutes.post("/:id/reminders", sendInvoiceReminder);

// GET /invoices/lease/:leaseId - Get invoices for a specific lease
invoiceRoutes.get("/lease/:leaseId", getLeaseInvoices);

export default invoiceRoutes;