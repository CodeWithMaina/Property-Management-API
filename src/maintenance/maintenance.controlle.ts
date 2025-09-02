// maintenance.controller.ts
import { Request, Response } from "express";
import {
  getMaintenanceRequestsService,
  getMaintenanceRequestByIdService,
  createMaintenanceRequestService,
  updateMaintenanceRequestService,
  assignMaintenanceRequestService,
  unassignMaintenanceRequestService,
  changeMaintenanceRequestStatusService,
  closeMaintenanceRequestService,
  addMaintenanceRequestEstimateService,
  addMaintenanceRequestCommentService,
  addMaintenanceRequestAttachmentService,
  getMaintenanceRequestsByPropertyService,
  getMaintenanceRequestsByAssignedUserService,
} from "./maintenance.service";
import {
  createSuccessResponse,
  createPaginatedResponse,
  createMaintenanceRequestResponse,
  createMaintenanceRequestsResponse,
} from "../utils/apiResponse/apiResponse.helper";
import { asyncHandler, ValidationError } from "../utils/errorHandler";
import {
  CreateMaintenanceRequestSchema,
  UpdateMaintenanceRequestSchema,
  MaintenanceRequestFiltersSchema,
  AddCommentSchema,
  AddAttachmentSchema,
  ChangeStatusSchema,
  AssignRequestSchema,
  AddEstimateSchema,
} from "./maintenance.validator";

/**
 * @route GET /maintenance-requests
 * @description Get all maintenance requests with optional filtering and pagination
 * @access Private (Admin/SuperAdmin/PropertyOwner/Manager/Caretaker)
 */
export const getMaintenanceRequests = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const validatedQuery = MaintenanceRequestFiltersSchema.parse(req.query);
  const organizationId = (req as any).user?.organizationId;
  
  const result = await getMaintenanceRequestsService(validatedQuery, organizationId);
  
  const response = createPaginatedResponse(
    result.data,
    result.pagination,
    "Maintenance requests retrieved successfully"
  );

  res.status(200).json(response);
});

/**
 * @route GET /maintenance-requests/:id
 * @description Get specific maintenance request details
 * @access Private (Admin/SuperAdmin/PropertyOwner/Manager/Caretaker)
 */
export const getMaintenanceRequestById = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const requestId = req.params.id;
  const organizationId = (req as any).user?.organizationId;

  if (!requestId) {
    throw new ValidationError("Maintenance request ID is required");
  }

  const request = await getMaintenanceRequestByIdService(requestId, organizationId);

  const response = createMaintenanceRequestResponse(request, "Maintenance request retrieved successfully");

  res.status(200).json(response);
});

/**
 * @route POST /maintenance-requests
 * @description Create a new maintenance request
 * @access Private (Admin/SuperAdmin/PropertyOwner/Manager/Caretaker/Tenant)
 */
export const createMaintenanceRequest = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const validatedData = CreateMaintenanceRequestSchema.parse(req.body);
  const createdByUserId = (req as any).user?.id;
  const organizationId = (req as any).user?.organizationId;

  if (!organizationId) {
    throw new ValidationError("Organization context is required");
  }

  const newRequest = await createMaintenanceRequestService(validatedData, createdByUserId, organizationId);

  const response = createMaintenanceRequestResponse(newRequest, "Maintenance request created successfully");

  res.status(201).json(response);
});

/**
 * @route PUT /maintenance-requests/:id
 * @description Update maintenance request information
 * @access Private (Admin/SuperAdmin/PropertyOwner/Manager)
 */
export const updateMaintenanceRequest = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const requestId = req.params.id;
  const organizationId = (req as any).user?.organizationId;
  const actorUserId = (req as any).user?.id;

  if (!requestId) {
    throw new ValidationError("Maintenance request ID is required");
  }

  if (!organizationId) {
    throw new ValidationError("Organization context is required");
  }

  const validatedData = UpdateMaintenanceRequestSchema.parse(req.body);

  const updatedRequest = await updateMaintenanceRequestService(requestId, validatedData, actorUserId, organizationId);

  const response = createMaintenanceRequestResponse(updatedRequest, "Maintenance request updated successfully");

  res.status(200).json(response);
});

/**
 * @route POST /maintenance-requests/:id/assign
 * @description Assign a maintenance request to a staff member
 * @access Private (Admin/SuperAdmin/PropertyOwner/Manager)
 */
export const assignMaintenanceRequest = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const requestId = req.params.id;
  const organizationId = (req as any).user?.organizationId;
  const actorUserId = (req as any).user?.id;

  if (!requestId) {
    throw new ValidationError("Maintenance request ID is required");
  }

  if (!organizationId) {
    throw new ValidationError("Organization context is required");
  }

  const validatedData = AssignRequestSchema.parse(req.body);

  const updatedRequest = await assignMaintenanceRequestService(requestId, validatedData, actorUserId, organizationId);

  const response = createMaintenanceRequestResponse(updatedRequest, "Maintenance request assigned successfully");

  res.status(200).json(response);
});

/**
 * @route POST /maintenance-requests/:id/unassign
 * @description Unassign a maintenance request from the current staff member
 * @access Private (Admin/SuperAdmin/PropertyOwner/Manager)
 */
export const unassignMaintenanceRequest = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const requestId = req.params.id;
  const organizationId = (req as any).user?.organizationId;
  const actorUserId = (req as any).user?.id;

  if (!requestId) {
    throw new ValidationError("Maintenance request ID is required");
  }

  if (!organizationId) {
    throw new ValidationError("Organization context is required");
  }

  const updatedRequest = await unassignMaintenanceRequestService(requestId, actorUserId, organizationId);

  const response = createMaintenanceRequestResponse(updatedRequest, "Maintenance request unassigned successfully");

  res.status(200).json(response);
});

/**
 * @route POST /maintenance-requests/:id/change-status
 * @description Change the status of a maintenance request
 * @access Private (Admin/SuperAdmin/PropertyOwner/Manager/Caretaker)
 */
export const changeMaintenanceRequestStatus = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const requestId = req.params.id;
  const organizationId = (req as any).user?.organizationId;
  const actorUserId = (req as any).user?.id;

  if (!requestId) {
    throw new ValidationError("Maintenance request ID is required");
  }

  if (!organizationId) {
    throw new ValidationError("Organization context is required");
  }

  const validatedData = ChangeStatusSchema.parse(req.body);

  const updatedRequest = await changeMaintenanceRequestStatusService(requestId, validatedData, actorUserId, organizationId);

  const response = createMaintenanceRequestResponse(updatedRequest, "Maintenance request status updated successfully");

  res.status(200).json(response);
});

/**
 * @route POST /maintenance-requests/:id/close
 * @description Close a resolved maintenance request
 * @access Private (Admin/SuperAdmin/PropertyOwner/Manager)
 */
export const closeMaintenanceRequest = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const requestId = req.params.id;
  const organizationId = (req as any).user?.organizationId;
  const actorUserId = (req as any).user?.id;

  if (!requestId) {
    throw new ValidationError("Maintenance request ID is required");
  }

  if (!organizationId) {
    throw new ValidationError("Organization context is required");
  }

  const updatedRequest = await closeMaintenanceRequestService(requestId, actorUserId, organizationId);

  const response = createMaintenanceRequestResponse(updatedRequest, "Maintenance request closed successfully");

  res.status(200).json(response);
});

/**
 * @route POST /maintenance-requests/:id/add-estimate
 * @description Add a cost estimate to a maintenance request
 * @access Private (Admin/SuperAdmin/PropertyOwner/Manager)
 */
export const addMaintenanceRequestEstimate = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const requestId = req.params.id;
  const organizationId = (req as any).user?.organizationId;
  const actorUserId = (req as any).user?.id;

  if (!requestId) {
    throw new ValidationError("Maintenance request ID is required");
  }

  if (!organizationId) {
    throw new ValidationError("Organization context is required");
  }

  const validatedData = AddEstimateSchema.parse(req.body);

  const updatedRequest = await addMaintenanceRequestEstimateService(requestId, validatedData, actorUserId, organizationId);

  const response = createMaintenanceRequestResponse(updatedRequest, "Cost estimate added successfully");

  res.status(200).json(response);
});

/**
 * @route GET /maintenance-requests/property/:propertyId
 * @description Get maintenance requests for a specific property
 * @access Private (Admin/SuperAdmin/PropertyOwner/Manager/Caretaker)
 */
export const getMaintenanceRequestsByProperty = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const propertyId = req.params.propertyId;
  const validatedQuery = MaintenanceRequestFiltersSchema.omit({ propertyId: true }).parse(req.query);
  const organizationId = (req as any).user?.organizationId;

  if (!propertyId) {
    throw new ValidationError("Property ID is required");
  }

  const result = await getMaintenanceRequestsByPropertyService(propertyId, validatedQuery, organizationId);
  
  const response = createPaginatedResponse(
    result.data,
    result.pagination,
    "Maintenance requests retrieved successfully"
  );

  res.status(200).json(response);
});

/**
 * @route GET /maintenance-requests/assigned-to/:userId
 * @description Get maintenance requests assigned to a specific user
 * @access Private (Admin/SuperAdmin/PropertyOwner/Manager/Caretaker)
 */
export const getMaintenanceRequestsByAssignedUser = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const userId = req.params.userId;
  const validatedQuery = MaintenanceRequestFiltersSchema.omit({ assignedToUserId: true }).parse(req.query);
  const organizationId = (req as any).user?.organizationId;

  if (!userId) {
    throw new ValidationError("User ID is required");
  }

  const result = await getMaintenanceRequestsByAssignedUserService(userId, validatedQuery, organizationId);
  
  const response = createPaginatedResponse(
    result.data,
    result.pagination,
    "Maintenance requests retrieved successfully"
  );

  res.status(200).json(response);
});

/**
 * @route POST /maintenance-requests/:id/comments
 * @description Add a comment to a maintenance request
 * @access Private (Admin/SuperAdmin/PropertyOwner/Manager/Caretaker/Tenant)
 */
export const addMaintenanceRequestComment = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const requestId = req.params.id;
  const authorUserId = (req as any).user?.id;
  const organizationId = (req as any).user?.organizationId;

  if (!requestId) {
    throw new ValidationError("Maintenance request ID is required");
  }

  if (!organizationId) {
    throw new ValidationError("Organization context is required");
  }

  const validatedData = AddCommentSchema.parse(req.body);

  const newComment = await addMaintenanceRequestCommentService(requestId, validatedData, authorUserId, organizationId);

  const response = createSuccessResponse(newComment, "Comment added successfully");

  res.status(201).json(response);
});

/**
 * @route POST /maintenance-requests/:id/attachments
 * @description Add an attachment to a maintenance request
 * @access Private (Admin/SuperAdmin/PropertyOwner/Manager/Caretaker/Tenant)
 */
export const addMaintenanceRequestAttachment = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const requestId = req.params.id;
  const actorUserId = (req as any).user?.id;
  const organizationId = (req as any).user?.organizationId;

  if (!requestId) {
    throw new ValidationError("Maintenance request ID is required");
  }

  if (!organizationId) {
    throw new ValidationError("Organization context is required");
  }

  const validatedData = AddAttachmentSchema.parse(req.body);

  const newAttachment = await addMaintenanceRequestAttachmentService(requestId, validatedData, actorUserId, organizationId);

  const response = createSuccessResponse(newAttachment, "Attachment added successfully");

  res.status(201).json(response);
});