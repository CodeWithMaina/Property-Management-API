// src/controllers/base.controller.ts
import { Request, Response } from "express";
import { asyncHandler, NotFoundError } from "../utils/errorHandler";
import { activityLogger } from "../utils/activityLogger";
import {
  createPaginatedResponse,
  createSuccessResponse,
} from "../utils/apiResponse/apiResponse.helper";

export interface PaginationResult<T> {
  data: T[];
  pagination: {
    page: number;
    perPage: number;
    total: number;
    totalPages: number;
  };
}

export interface BaseService<T> {
  findById(id: string): Promise<T | null>;
  findAll(
    page: number,
    perPage: number
  ): Promise<PaginationResult<T>>;
  create(data: any): Promise<T>;
  update(id: string, data: any): Promise<T>;
  delete(id: string): Promise<void>;
}

export class BaseController<T extends { id: string | number }> {
  constructor(
    private readonly entityName: string,
    private readonly service: BaseService<T>
  ) {}

  getById = asyncHandler(async (req: Request, res: Response) => {
    const entity = await this.service.findById(req.params.id);
    if (!entity) throw new NotFoundError(this.entityName);

    res.json(
      createSuccessResponse(
        entity,
        `${this.entityName} retrieved successfully.`
      )
    );
  });

  getAll = asyncHandler(async (req: Request, res: Response) => {
    const { page = 1, perPage = 10 } = req.query;
    const { data, pagination } = await this.service.findAll(
      Number(page),
      Number(perPage)
    );

    res.json(
      createPaginatedResponse(
        data,
        pagination,
        `${this.entityName}s retrieved successfully.`
      )
    );
  });

  create = asyncHandler(async (req: Request, res: Response) => {
    const entity = await this.service.create(req.body);

    // Safe: entity must have `id`
    await activityLogger.created(
      this.entityName,
      entity.id,
      req.user?.id,
      req.user?.organizationId
    );

    res
      .status(201)
      .json(
        createSuccessResponse(
          entity,
          `${this.entityName} created successfully.`
        )
      );
  });

  update = asyncHandler(async (req: Request, res: Response) => {
    const entity = await this.service.update(req.params.id, req.body);

    await activityLogger.updated(
      this.entityName,
      entity.id,
      req.user?.id,
      req.user?.organizationId
    );

    res.json(
      createSuccessResponse(
        entity,
        `${this.entityName} updated successfully.`
      )
    );
  });

  delete = asyncHandler(async (req: Request, res: Response) => {
    await this.service.delete(req.params.id);

    await activityLogger.deleted(
      this.entityName,
      req.params.id,
      req.user?.id,
      req.user?.organizationId
    );

    res.json(
      createSuccessResponse(
        null,
        `${this.entityName} deleted successfully.`
      )
    );
  });
}
