// lease.controller.ts
import { Request, Response } from "express";
import {
  getLeasesServices,
  getLeaseByIdServices,
  createLeaseServices,
  updateLeaseServices,
  deleteLeaseServices,
  updateLeaseStatusServices,
  getLeasesByTenantServices,
  getLeasesByPropertyServices,
  getLeaseBalanceServices,
  renewLeaseServices,
  generateFirstInvoiceServices,
} from "./lease.service";
import {
  LeaseSchema,
  PartialLeaseSchema,
  LeaseQuerySchema,
  LeaseStatusChangeSchema,
  LeaseRenewalSchema,
} from "./lease.validator";
import {
  asyncHandler,
  NotFoundError,
  ValidationError,
  ConflictError,
} from "../utils/errorHandler";
import {
  createSuccessResponse,
  createPaginatedResponse,
  createLeaseResponse,
  createLeasesResponse,
} from "../utils/apiResponse/apiResponse.helper";

/**
 * @route GET /leases
 * @description Get all leases with optional filtering
 * @access Private
 */
export const getLeases = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    // Validate query parameters
    const queryParams = LeaseQuerySchema.parse(req.query);

    const result = await getLeasesServices(queryParams);

    // Create pagination object
    const pagination = {
      total: result.total,
      count: result.leases.length,
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
      result.leases,
      pagination,
      "Leases retrieved successfully"
    );

    res.status(200).json(response);
  }
);

/**
 * @route POST /leases
 * @description Create a new lease (typically in 'draft' status)
 * @access Private (Admin/Organization Owner/Property Manager)
 */
export const createLease = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    // Validate request body
    const validatedData = LeaseSchema.parse(req.body);

    const newLease = await createLeaseServices(validatedData);

    const response = createSuccessResponse(
      newLease,
      "Lease created successfully"
    );

    res.status(201).json(response);
  }
);

/**
 * @route GET /leases/:id
 * @description Get specific lease details
 * @access Private
 */
export const getLeaseById = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const leaseId = req.params.id;

    if (!leaseId) {
      throw new ValidationError("Lease ID is required");
    }

    const lease = await getLeaseByIdServices(leaseId);

    if (!lease) {
      throw new NotFoundError("Lease");
    }

    const response = createLeaseResponse(
      lease,
      "Lease retrieved successfully"
    );

    res.status(200).json(response);
  }
);

/**
 * @route PUT /leases/:id
 * @description Update lease information
 * @access Private (Admin/Organization Owner/Property Manager)
 */
export const updateLease = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const leaseId = req.params.id;

    if (!leaseId) {
      throw new ValidationError("Lease ID is required");
    }

    // Validate request body
    const validatedData = PartialLeaseSchema.parse(req.body);

    const updatedLease = await updateLeaseServices(leaseId, validatedData);

    if (!updatedLease) {
      throw new NotFoundError("Lease");
    }

    const response = createSuccessResponse(
      updatedLease,
      "Lease updated successfully"
    );

    res.status(200).json(response);
  }
);

/**
 * @route DELETE /leases/:id
 * @description Delete a lease (only allowed for drafts)
 * @access Private (Admin/Organization Owner)
 */
export const deleteLease = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const leaseId = req.params.id;

    if (!leaseId) {
      throw new ValidationError("Lease ID is required");
    }

    const deletedLease = await deleteLeaseServices(leaseId);

    if (!deletedLease) {
      throw new NotFoundError("Lease");
    }

    const response = createSuccessResponse(
      deletedLease,
      "Lease deleted successfully"
    );

    res.status(200).json(response);
  }
);

/**
 * @route POST /leases/:id/activate
 * @description Transition a lease to 'active'. Triggers unit status change and may generate first invoice.
 * @access Private (Admin/Organization Owner/Property Manager)
 */
export const activateLease = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const leaseId = req.params.id;

    if (!leaseId) {
      throw new ValidationError("Lease ID is required");
    }

    // Validate request body
    const validatedData = LeaseStatusChangeSchema.parse(req.body);

    // Update lease status to active
    const updatedLease = await updateLeaseStatusServices(leaseId, "active", validatedData);

    if (!updatedLease) {
      throw new NotFoundError("Lease");
    }

    // Generate first invoice
    const invoice = await generateFirstInvoiceServices(leaseId);

    const response = createSuccessResponse(
      {
        lease: updatedLease,
        invoice,
      },
      "Lease activated successfully and first invoice generated"
    );

    res.status(200).json(response);
  }
);

/**
 * @route POST /leases/:id/terminate
 * @description Terminate a lease early
 * @access Private (Admin/Organization Owner/Property Manager)
 */
export const terminateLease = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const leaseId = req.params.id;

    if (!leaseId) {
      throw new ValidationError("Lease ID is required");
    }

    // Validate request body
    const validatedData = LeaseStatusChangeSchema.parse(req.body);

    const updatedLease = await updateLeaseStatusServices(leaseId, "terminated", validatedData);

    if (!updatedLease) {
      throw new NotFoundError("Lease");
    }

    const response = createSuccessResponse(
      updatedLease,
      "Lease terminated successfully"
    );

    res.status(200).json(response);
  }
);

/**
 * @route POST /leases/:id/renew
 * @description Create a new lease based on an expiring one
 * @access Private (Admin/Organization Owner/Property Manager)
 */
export const renewLease = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const leaseId = req.params.id;

    if (!leaseId) {
      throw new ValidationError("Lease ID is required");
    }

    // Validate request body
    const validatedData = LeaseRenewalSchema.parse(req.body);

    const newLease = await renewLeaseServices(leaseId, validatedData);

    const response = createSuccessResponse(
      newLease,
      "Lease renewed successfully"
    );

    res.status(201).json(response);
  }
);

/**
 * @route POST /leases/:id/cancel
 * @description Cancel a draft or pending lease
 * @access Private (Admin/Organization Owner/Property Manager)
 */
export const cancelLease = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const leaseId = req.params.id;

    if (!leaseId) {
      throw new ValidationError("Lease ID is required");
    }

    // Validate request body
    const validatedData = LeaseStatusChangeSchema.parse(req.body);

    const updatedLease = await updateLeaseStatusServices(leaseId, "cancelled", validatedData);

    if (!updatedLease) {
      throw new NotFoundError("Lease");
    }

    const response = createSuccessResponse(
      updatedLease,
      "Lease cancelled successfully"
    );

    res.status(200).json(response);
  }
);

/**
 * @route PATCH /leases/:id/status
 * @description Directly update lease status (e.g., to 'ended')
 * @access Private (Admin/Organization Owner/Property Manager)
 */
export const updateLeaseStatus = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const leaseId = req.params.id;
    const { status } = req.body;

    if (!leaseId) {
      throw new ValidationError("Lease ID is required");
    }

    if (!status) {
      throw new ValidationError("Status is required");
    }

    // Validate status is a valid lease status
    const validStatuses = ["draft", "active", "pendingMoveIn", "ended", "terminated", "cancelled"];
    if (!validStatuses.includes(status)) {
      throw new ValidationError("Invalid lease status");
    }

    // Validate request body
    const validatedData = LeaseStatusChangeSchema.parse(req.body);

    const updatedLease = await updateLeaseStatusServices(leaseId, status as any, validatedData);

    if (!updatedLease) {
      throw new NotFoundError("Lease");
    }

    const response = createSuccessResponse(
      updatedLease,
      `Lease status updated to ${status} successfully`
    );

    res.status(200).json(response);
  }
);

/**
 * @route GET /leases/tenant/:userId
 * @description Get leases for a specific tenant
 * @access Private
 */
export const getLeasesByTenant = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const userId = req.params.userId;

    if (!userId) {
      throw new ValidationError("User ID is required");
    }

    const leases = await getLeasesByTenantServices(userId);

    const response = createLeasesResponse(
      leases,
      undefined,
      "Tenant leases retrieved successfully"
    );

    res.status(200).json(response);
  }
);

/**
 * @route GET /leases/property/:propertyId
 * @description Get leases for a property
 * @access Private
 */
export const getLeasesByProperty = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const propertyId = req.params.propertyId;

    if (!propertyId) {
      throw new ValidationError("Property ID is required");
    }

    const leases = await getLeasesByPropertyServices(propertyId);

    const response = createLeasesResponse(
      leases,
      undefined,
      "Property leases retrieved successfully"
    );

    res.status(200).json(response);
  }
);

/**
 * @route GET /leases/:id/balance
 * @description Calculate the real-time outstanding balance for the lease
 * @access Private
 */
export const getLeaseBalance = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const leaseId = req.params.id;

    if (!leaseId) {
      throw new ValidationError("Lease ID is required");
    }

    const balance = await getLeaseBalanceServices(leaseId);

    const response = createSuccessResponse(
      balance,
      "Lease balance calculated successfully"
    );

    res.status(200).json(response);
  }
);