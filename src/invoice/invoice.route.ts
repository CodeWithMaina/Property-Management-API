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
invoiceRoutes.get("/invoices", getInvoices);

// POST /invoices - Create a new, manual invoice
invoiceRoutes.post("/invoices", createInvoice);

// GET /invoices/:id - Get specific invoice details
invoiceRoutes.get("/invoices/:id", getInvoiceById);

// PUT /invoices/:id - Update invoice details
invoiceRoutes.put("/invoices/:id",updateInvoice);

// PATCH /invoices/:id/status - Update invoice status
invoiceRoutes.patch("/invoices/:id/status", updateInvoiceStatus);

// POST /invoices/:id/void - Void an invoice
invoiceRoutes.post("/:id/void", voidInvoice);

// POST /invoices/:id/items - Add line items to an invoice
invoiceRoutes.post("/invoices/:id/items", addInvoiceItem);

// PUT /invoices/:id/items/:itemId - Update an invoice line item
invoiceRoutes.put("/invoices/:id/items/:itemId", updateInvoiceItem);

// DELETE /invoices/:id/items/:itemId - Remove an invoice line item
invoiceRoutes.delete("/invoices/:id/items/:itemId", removeInvoiceItem);

// POST /invoices/generate - Admin/System: Batch-generate monthly invoices for all active leases
invoiceRoutes.post("/invoices/generate", batchGenerateInvoices);

// POST /invoices/:id/issue - Transition an invoice from 'draft' to 'issued'
invoiceRoutes.post("/invoices/:id/issue", issueInvoice);

// POST /invoices/:id/send-reminder - Send a payment reminder for an invoice
invoiceRoutes.post("/invoices/:id/send-reminder", sendInvoiceReminder);

// GET /invoices/lease/:leaseId - Get invoices for a specific lease
invoiceRoutes.get("/invoices/lease/:leaseId", getLeaseInvoices);

export default invoiceRoutes;