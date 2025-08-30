import { Request, Response } from "express";
import {
  getUnitsServices,
  getUnitByIdServices,
  createUnitServices,
  updateUnitServices,
  deleteUnitServices,
  getUnitAmenitiesServices,
  addUnitAmenityServices,
  removeUnitAmenityServices,
  updateUnitStatusServices,
} from "./unit.service";
import {
  UnitSchema,
  PartialUnitSchema,
  UnitQuerySchema,
  UnitAmenitySchema,
  UnitStatusChangeSchema,
} from "./unit.validator";
import {
  asyncHandler,
  NotFoundError,
  ValidationError,
  ConflictError,
} from "../utils/errorHandler";
import {
  createSuccessResponse,
  createPaginatedResponse,
  createUnitResponse,
  createUnitsResponse,
} from "../utils/apiResponse/apiResponse.helper";

/**
 * @route GET /units
 * @description Get all units with optional filtering
 * @access Private
 */
export const getUnits = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    // Validate query parameters
    const queryParams = UnitQuerySchema.parse(req.query);

    const result = await getUnitsServices(queryParams);

    // Create pagination object
    const pagination = {
      total: result.total,
      count: result.units.length,
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
      result.units,
      pagination,
      "Units retrieved successfully"
    );

    res.status(200).json(response);
  }
);

/**
 * @route GET /units/:id
 * @description Get specific unit details
 * @access Private
 */
export const getUnitById = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const unitId = req.params.id;

    if (!unitId) {
      throw new ValidationError("Unit ID is required");
    }

    const unit = await getUnitByIdServices(unitId);

    if (!unit) {
      throw new NotFoundError("Unit");
    }

    const response = createUnitResponse(
      unit,
      "Unit retrieved successfully"
    );

    res.status(200).json(response);
  }
);

/**
 * @route POST /units
 * @description Create a new unit
 * @access Private (Admin/Organization Owner/Property Manager)
 */
export const createUnit = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    // Validate request body
    const validatedData = UnitSchema.parse(req.body);

    const newUnit = await createUnitServices(validatedData);

    const response = createSuccessResponse(
      newUnit,
      "Unit created successfully"
    );

    res.status(201).json(response);
  }
);

/**
 * @route PUT /units/:id
 * @description Update unit information
 * @access Private (Admin/Organization Owner/Property Manager)
 */
export const updateUnit = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const unitId = req.params.id;

    if (!unitId) {
      throw new ValidationError("Unit ID is required");
    }

    // Validate request body
    const validatedData = PartialUnitSchema.parse(req.body);

    const updatedUnit = await updateUnitServices(unitId, validatedData);

    if (!updatedUnit) {
      throw new NotFoundError("Unit");
    }

    const response = createSuccessResponse(
      updatedUnit,
      "Unit updated successfully"
    );

    res.status(200).json(response);
  }
);

/**
 * @route DELETE /units/:id
 * @description Delete a unit (soft delete)
 * @access Private (Admin/Organization Owner)
 */
export const deleteUnit = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const unitId = req.params.id;

    if (!unitId) {
      throw new ValidationError("Unit ID is required");
    }

    const deletedUnit = await deleteUnitServices(unitId);

    if (!deletedUnit) {
      throw new NotFoundError("Unit");
    }

    const response = createSuccessResponse(
      deletedUnit,
      "Unit deleted successfully"
    );

    res.status(200).json(response);
  }
);

/**
 * @route GET /units/:id/amenities
 * @description List amenities for a unit
 * @access Private
 */
export const getUnitAmenities = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const unitId = req.params.id;

    if (!unitId) {
      throw new ValidationError("Unit ID is required");
    }

    const amenities = await getUnitAmenitiesServices(unitId);

    const response = createSuccessResponse(
      amenities,
      "Unit amenities retrieved successfully"
    );

    res.status(200).json(response);
  }
);

/**
 * @route POST /units/:id/amenities
 * @description Add an amenity to a unit
 * @access Private (Admin/Organization Owner/Property Manager)
 */
export const addUnitAmenity = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const unitId = req.params.id;

    if (!unitId) {
      throw new ValidationError("Unit ID is required");
    }

    // Validate request body
    const validatedData = UnitAmenitySchema.parse(req.body);

    try {
      const assignment = await addUnitAmenityServices(unitId, validatedData);

      const response = createSuccessResponse(
        assignment,
        "Amenity added to unit successfully"
      );

      res.status(201).json(response);
    } catch (error: any) {
      if (
        error.message === "Unit not found" ||
        error.message === "Amenity not found" ||
        error.message === "Amenity assignment not found"
      ) {
        throw new NotFoundError(error.message);
      }

      if (error.message === "Amenity is already assigned to this unit") {
        throw new ConflictError(error.message);
      }

      throw error;
    }
  }
);

/**
 * @route DELETE /units/:id/amenities/:amenityId
 * @description Remove an amenity from a unit
 * @access Private (Admin/Organization Owner/Property Manager)
 */
export const removeUnitAmenity = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const unitId = req.params.id;
    const amenityId = req.params.amenityId;

    if (!unitId || !amenityId) {
      throw new ValidationError("Unit ID and Amenity ID are required");
    }

    try {
      const result = await removeUnitAmenityServices(unitId, amenityId);

      const response = createSuccessResponse(
        result,
        "Amenity removed from unit successfully"
      );

      res.status(200).json(response);
    } catch (error: any) {
      if (error.message === "Amenity assignment not found") {
        throw new NotFoundError(error.message);
      }

      throw error;
    }
  }
);

/**
 * @route POST /units/:id/mark-occupied
 * @description Update a unit's status to occupied
 * @access Private (Admin/Organization Owner/Property Manager)
 */
export const markUnitOccupied = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const unitId = req.params.id;

    if (!unitId) {
      throw new ValidationError("Unit ID is required");
    }

    // Validate request body
    const validatedData = UnitStatusChangeSchema.parse(req.body);

    const updatedUnit = await updateUnitStatusServices(unitId, "occupied", validatedData);

    if (!updatedUnit) {
      throw new NotFoundError("Unit");
    }

    const response = createSuccessResponse(
      updatedUnit,
      "Unit marked as occupied successfully"
    );

    res.status(200).json(response);
  }
);

/**
 * @route POST /units/:id/mark-vacant
 * @description Update a unit's status to vacant
 * @access Private (Admin/Organization Owner/Property Manager)
 */
export const markUnitVacant = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const unitId = req.params.id;

    if (!unitId) {
      throw new ValidationError("Unit ID is required");
    }

    // Validate request body
    const validatedData = UnitStatusChangeSchema.parse(req.body);

    const updatedUnit = await updateUnitStatusServices(unitId, "vacant", validatedData);

    if (!updatedUnit) {
      throw new NotFoundError("Unit");
    }

    const response = createSuccessResponse(
      updatedUnit,
      "Unit marked as vacant successfully"
    );

    res.status(200).json(response);
  }
);

/**
 * @route POST /units/:id/mark-unavailable
 * @description Mark a unit as unavailable
 * @access Private (Admin/Organization Owner/Property Manager)
 */
export const markUnitUnavailable = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const unitId = req.params.id;

    if (!unitId) {
      throw new ValidationError("Unit ID is required");
    }

    // Validate request body
    const validatedData = UnitStatusChangeSchema.parse(req.body);

    const updatedUnit = await updateUnitStatusServices(unitId, "unavailable", validatedData);

    if (!updatedUnit) {
      throw new NotFoundError("Unit");
    }

    const response = createSuccessResponse(
      updatedUnit,
      "Unit marked as unavailable successfully"
    );

    res.status(200).json(response);
  }
);