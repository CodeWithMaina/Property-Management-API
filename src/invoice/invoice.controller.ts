// src/modules/invoice/invoice.controller.ts
import { Request, Response } from "express";
import {
  getInvoicesService,
  getInvoiceByIdService,
  createInvoiceService,
  updateInvoiceService,
  updateInvoiceStatusService,
  voidInvoiceService,
  addInvoiceItemService,
  updateInvoiceItemService,
  removeInvoiceItemService,
  batchGenerateInvoicesService,
  generateLeaseInvoiceService,
  getLeaseInvoicesService,
  sendInvoiceReminderService,
} from "./invoice.service";
import {
  InvoiceSchema,
  PartialInvoiceSchema,
  InvoiceStatusChangeSchema,
  InvoiceItemSchema,
  InvoiceQuerySchema,
  BatchGenerateInvoicesSchema,
  VoidInvoiceSchema,
  InvoiceReminderSchema,
} from "./invoice.validator";
import { asyncHandler, ValidationError,
  NotFoundError, } from "../utils/errorHandler";
import ActivityLogger from "../utils/activityLogger";
import { createInvoiceResponse, createSuccessResponse,
  createPaginatedResponse, } from "../utils/apiResponse/apiResponse.helper";

/**
 * @route GET /invoices
 * @description Get all invoices (filterable by status, lease, organization)
 * @access Private
 */
export const getInvoices = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    // Validate query parameters
    const queryParams = InvoiceQuerySchema.parse(req.query);

    // Get organization ID from authenticated user
    const organizationId = (req as any).user.organizationId;

    const result = await getInvoicesService({
      ...queryParams,
      organizationId: queryParams.organizationId || organizationId,
    });

    // Create pagination object
    const pagination = {
      total: result.total,
      count: result.invoices.length,
      perPage: queryParams.limit,
      currentPage: queryParams.page,
      totalPages: Math.ceil(result.total / queryParams.limit),
      links: {
        first: null,
        last: null,
        prev: null,
        next: null,
      },
    };

    const response = createPaginatedResponse(
      result.invoices,
      pagination,
      "Invoices retrieved successfully"
    );

    res.status(200).json(response);
  }
);

/**
 * @route POST /invoices
 * @description Create a new, manual invoice
 * @access Private (Admin/Organization Owner/Property Manager)
 */
export const createInvoice = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    // Validate request body
    const validatedData = InvoiceSchema.parse(req.body);

    // Get organization ID from authenticated user
    const organizationId = (req as any).user.organizationId;
    const userId = (req as any).user.id;

    const newInvoice = await createInvoiceService(
      validatedData,
      organizationId
    );

    // Log activity
    await ActivityLogger.created(
      'invoices',
      newInvoice.id,
      {
        userId,
        orgId: organizationId,
        description: `Invoice ${newInvoice.invoiceNumber} created`,
        metadata: { invoiceData: validatedData }
      }
    );

    const response = createSuccessResponse(
      newInvoice,
      "Invoice created successfully"
    );

    res.status(201).json(response);
  }
);

/**
 * @route GET /invoices/:id
 * @description Get specific invoice details
 * @access Private
 */
export const getInvoiceById = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const invoiceId = req.params.id;

    if (!invoiceId) {
      throw new ValidationError("Invoice ID is required");
    }

    // Get organization ID from authenticated user
    const organizationId = (req as any).user.organizationId;

    const invoice = await getInvoiceByIdService(invoiceId, organizationId);

    if (!invoice) {
      throw new NotFoundError("Invoice");
    }

    const response = createInvoiceResponse(
      invoice,
      "Invoice retrieved successfully"
    );

    res.status(200).json(response);
  }
);

/**
 * @route PUT /invoices/:id
 * @description Update invoice details
 * @access Private (Admin/Organization Owner/Property Manager)
 */
export const updateInvoice = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const invoiceId = req.params.id;

    if (!invoiceId) {
      throw new ValidationError("Invoice ID is required");
    }

    // Validate request body
    const validatedData = PartialInvoiceSchema.parse(req.body);

    // Get organization ID from authenticated user
    const organizationId = (req as any).user.organizationId;
    const userId = (req as any).user.id;

    const updatedInvoice = await updateInvoiceService(
      invoiceId,
      validatedData,
      organizationId
    );

    if (!updatedInvoice) {
      throw new NotFoundError("Invoice");
    }

    // Log activity
    await ActivityLogger.updated(
      'invoices',
      invoiceId,
      validatedData,
      {
        userId,
        orgId: organizationId,
        description: `Invoice ${updatedInvoice.invoiceNumber} updated`,
        metadata: { updateData: validatedData }
      }
    );

    const response = createSuccessResponse(
      updatedInvoice,
      "Invoice updated successfully"
    );

    res.status(200).json(response);
  }
);

/**
 * @route PATCH /invoices/:id/status
 * @description Update invoice status
 * @access Private (Admin/Organization Owner/Property Manager)
 */
export const updateInvoiceStatus = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const invoiceId = req.params.id;

    if (!invoiceId) {
      throw new ValidationError("Invoice ID is required");
    }

    // Validate request body
    const validatedData = InvoiceStatusChangeSchema.parse(req.body);

    // Get organization ID from authenticated user
    const organizationId = (req as any).user.organizationId;
    const userId = (req as any).user.id;

    const updatedInvoice = await updateInvoiceStatusService(
      invoiceId,
      validatedData.status,
      validatedData,
      organizationId
    );

    if (!updatedInvoice) {
      throw new NotFoundError("Invoice");
    }

    // Log activity
    await ActivityLogger.statusChange(
      'invoices',
      invoiceId,
      validatedData.status,
      {
        userId,
        orgId: organizationId,
        description: `Invoice ${updatedInvoice.invoiceNumber} status changed to ${validatedData.status}`,
        metadata: { statusData: validatedData }
      }
    );

    const response = createSuccessResponse(
      updatedInvoice,
      "Invoice status updated successfully"
    );

    res.status(200).json(response);
  }
);

/**
 * @route POST /invoices/:id/void
 * @description Void an invoice
 * @access Private (Admin/Organization Owner)
 */
export const voidInvoice = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const invoiceId = req.params.id;

    if (!invoiceId) {
      throw new ValidationError("Invoice ID is required");
    }

    // Validate request body
    const validatedData = VoidInvoiceSchema.parse(req.body);

    // Get organization ID from authenticated user
    const organizationId = (req as any).user.organizationId;
    const userId = (req as any).user.id;

    const voidedInvoice = await voidInvoiceService(
      invoiceId,
      validatedData,
      organizationId
    );

    if (!voidedInvoice) {
      throw new NotFoundError("Invoice");
    }

    // Log activity
    await ActivityLogger.statusChange(
      'invoices',
      invoiceId,
      'void',
      {
        userId,
        orgId: organizationId,
        description: `Invoice ${voidedInvoice.invoiceNumber} voided`,
        metadata: { voidData: validatedData }
      }
    );

    const response = createSuccessResponse(
      voidedInvoice,
      "Invoice voided successfully"
    );

    res.status(200).json(response);
  }
);

/**
 * @route POST /invoices/:id/items
 * @description Add line items to an invoice
 * @access Private (Admin/Organization Owner/Property Manager)
 */
export const addInvoiceItem = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const invoiceId = req.params.id;

    if (!invoiceId) {
      throw new ValidationError("Invoice ID is required");
    }

    // Validate request body
    const validatedData = InvoiceItemSchema.parse(req.body);

    // Get organization ID from authenticated user
    const organizationId = (req as any).user.organizationId;
    const userId = (req as any).user.id;

    const newItem = await addInvoiceItemService(
      invoiceId,
      validatedData,
      organizationId
    );

    // Log activity
    await ActivityLogger.created(
      'invoiceItems',
      newItem.id,
      {
        userId,
        orgId: organizationId,
        description: `Item added to invoice ${invoiceId}`,
        metadata: { itemData: validatedData }
      }
    );

    const response = createSuccessResponse(
      newItem,
      "Invoice item added successfully"
    );

    res.status(201).json(response);
  }
);

/**
 * @route PUT /invoices/:id/items/:itemId
 * @description Update an invoice line item
 * @access Private (Admin/Organization Owner/Property Manager)
 */
export const updateInvoiceItem = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const { id: invoiceId, itemId } = req.params;

    if (!invoiceId || !itemId) {
      throw new ValidationError("Invoice ID and Item ID are required");
    }

    // Validate request body
    const validatedData = InvoiceItemSchema.partial().parse(req.body);

    // Get organization ID from authenticated user
    const organizationId = (req as any).user.organizationId;
    const userId = (req as any).user.id;

    const updatedItem = await updateInvoiceItemService(
      invoiceId,
      itemId,
      validatedData,
      organizationId
    );

    if (!updatedItem) {
      throw new NotFoundError("Invoice item");
    }

    // Log activity
    await ActivityLogger.updated(
      'invoiceItems',
      itemId,
      validatedData,
      {
        userId,
        orgId: organizationId,
        description: `Item ${itemId} updated in invoice ${invoiceId}`,
        metadata: { updateData: validatedData }
      }
    );

    const response = createSuccessResponse(
      updatedItem,
      "Invoice item updated successfully"
    );

    res.status(200).json(response);
  }
);

/**
 * @route DELETE /invoices/:id/items/:itemId
 * @description Remove an invoice line item
 * @access Private (Admin/Organization Owner/Property Manager)
 */
export const removeInvoiceItem = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const { id: invoiceId, itemId } = req.params;

    if (!invoiceId || !itemId) {
      throw new ValidationError("Invoice ID and Item ID are required");
    }

    // Get organization ID from authenticated user
    const organizationId = (req as any).user.organizationId;
    const userId = (req as any).user.id;

    const removedItem = await removeInvoiceItemService(
      invoiceId,
      itemId,
      organizationId
    );

    if (!removedItem) {
      throw new NotFoundError("Invoice item");
    }

    // Log activity
    await ActivityLogger.deleted(
      'invoiceItems',
      itemId,
      {
        userId,
        orgId: organizationId,
        description: `Item ${itemId} removed from invoice ${invoiceId}`,
        metadata: { removedItem }
      }
    );

    const response = createSuccessResponse(
      removedItem,
      "Invoice item removed successfully"
    );

    res.status(200).json(response);
  }
);

/**
 * @route POST /invoices/generate
 * @description Admin/System: Batch-generate monthly invoices for all active leases
 * @access Private (Admin/Organization Owner)
 */
export const batchGenerateInvoices = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    // Validate request body
    const validatedData = BatchGenerateInvoicesSchema.parse(req.body);

    // Get organization ID from authenticated user
    const organizationId = (req as any).user.organizationId;
    const userId = (req as any).user.id;

    const result = await batchGenerateInvoicesService(
      validatedData,
      organizationId
    );

    // Log activity
    await ActivityLogger.created(
      'invoices',
      'batch',
      {
        userId,
        orgId: organizationId,
        description: `Batch generated ${result.generated} invoices, skipped ${result.skipped}`,
        metadata: { batchData: validatedData, result }
      }
    );

    const response = createSuccessResponse(
      result,
      `Generated ${result.generated} invoices, skipped ${result.skipped}`
    );

    res.status(200).json(response);
  }
);

/**
 * @route POST /leases/:id/generate-invoice
 * @description Manually generate an invoice for a specific lease
 * @access Private (Admin/Organization Owner/Property Manager)
 */
export const generateLeaseInvoice = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const leaseId = req.params.id;

    if (!leaseId) {
      throw new ValidationError("Lease ID is required");
    }

    // Get organization ID from authenticated user
    const organizationId = (req as any).user.organizationId;
    const userId = (req as any).user.id;

    const newInvoice = await generateLeaseInvoiceService(
      leaseId,
      organizationId
    );

    // Log activity
    await ActivityLogger.created(
      'invoices',
      newInvoice.id,
      {
        userId,
        orgId: organizationId,
        description: `Invoice generated for lease ${leaseId}`,
        metadata: { leaseId, invoice: newInvoice }
      }
    );

    const response = createSuccessResponse(
      newInvoice,
      "Invoice generated successfully"
    );

    res.status(201).json(response);
  }
);

/**
 * @route PATCH /invoices/:id/issue
 * @description Transition an invoice from 'draft' to 'issued'
 * @access Private (Admin/Organization Owner/Property Manager)
 */
export const issueInvoice = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const invoiceId = req.params.id;

    if (!invoiceId) {
      throw new ValidationError("Invoice ID is required");
    }

    // Get organization ID from authenticated user
    const organizationId = (req as any).user.organizationId;
    const userId = (req as any).user.id;

    const issuedInvoice = await updateInvoiceStatusService(
      invoiceId,
      "issued",
      { status: "issued" },
      organizationId
    );

    if (!issuedInvoice) {
      throw new NotFoundError("Invoice");
    }

    // Log activity
    await ActivityLogger.statusChange(
      'invoices',
      invoiceId,
      'issued',
      {
        userId,
        orgId: organizationId,
        description: `Invoice ${issuedInvoice.invoiceNumber} issued`,
        metadata: { previousStatus: 'draft' }
      }
    );

    const response = createSuccessResponse(
      issuedInvoice,
      "Invoice issued successfully"
    );

    res.status(200).json(response);
  }
);

/**
 * @route POST /invoices/:id/reminders
 * @description Send a payment reminder for an invoice
 * @access Private (Admin/Organization Owner/Property Manager)
 */
export const sendInvoiceReminder = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const invoiceId = req.params.id;

    if (!invoiceId) {
      throw new ValidationError("Invoice ID is required");
    }

    // Validate request body
    const validatedData = InvoiceReminderSchema.parse(req.body);

    // Get organization ID from authenticated user
    const organizationId = (req as any).user.organizationId;
    const userId = (req as any).user.id;

    const result = await sendInvoiceReminderService(
      invoiceId,
      validatedData,
      organizationId
    );

    // Log activity
    await ActivityLogger.updated(
      'invoices',
      invoiceId,
      { reminderSent: true },
      {
        userId,
        orgId: organizationId,
        description: `Reminder sent for invoice ${invoiceId}`,
        metadata: { reminderData: validatedData }
      }
    );

    const response = createSuccessResponse(
      result,
      "Invoice reminder sent successfully"
    );

    res.status(200).json(response);
  }
);

/**
 * @route GET /invoices/lease/:leaseId
 * @description Get invoices for a specific lease
 * @access Private
 */
export const getLeaseInvoices = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const leaseId = req.params.leaseId;

    if (!leaseId) {
      throw new ValidationError("Lease ID is required");
    }

    // Get organization ID from authenticated user
    const organizationId = (req as any).user.organizationId;

    const leaseInvoices = await getLeaseInvoicesService(
      leaseId,
      organizationId
    );

    const response = createSuccessResponse(
      leaseInvoices,
      "Lease invoices retrieved successfully"
    );

    res.status(200).json(response);
  }
);