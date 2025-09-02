// maintenance.types.ts
import { 
  MaintenanceRequest, 
  MaintenanceComment, 
  MaintenanceAttachment, 
  User, 
  Property, 
  Unit,
  MaintenanceStatusEnum,
  PriorityEnum 
} from "../drizzle/schema";

export interface MaintenanceRequestResponse extends MaintenanceRequest {
  property?: Property;
  unit?: Unit | null;
  createdBy?: Partial<User> | null;
  assignedTo?: Partial<User> | null;
  comments?: (MaintenanceComment & { author?: Partial<User> | null })[];
  attachments?: MaintenanceAttachment[];
}

export interface CreateMaintenanceRequestInput {
  propertyId: string;
  unitId?: string;
  title: string;
  description: string;
  priority?: PriorityEnum;
  scheduledAt?: Date;
}

export interface UpdateMaintenanceRequestInput {
  title?: string;
  description?: string;
  priority?: PriorityEnum;
  scheduledAt?: Date;
  costAmount?: number;
  metadata?: Record<string, unknown>;
}

export interface MaintenanceRequestFilters {
  status?: MaintenanceStatusEnum;
  priority?: PriorityEnum;
  propertyId?: string;
  assignedToUserId?: string;
  createdByUserId?: string;
  search?: string;
  page?: number;
  limit?: number;
}

export interface PaginatedMaintenanceRequests {
  data: MaintenanceRequestResponse[];
  pagination: {
    total: number;
    count: number;
    perPage: number;
    currentPage: number;
    totalPages: number;
    links?: {
      first: string | null;
      last: string | null;
      prev: string | null;
      next: string | null;
    };
  };
}

export interface AddCommentInput {
  body: string;
}

export interface AddAttachmentInput {
  fileUrl: string;
  fileName: string;
  contentType?: string;
  sizeBytes?: number;
}

export interface ChangeStatusInput {
  status: MaintenanceStatusEnum;
  notes?: string;
}

export interface AssignRequestInput {
  assignedToUserId: string;
}

export interface AddEstimateInput {
  costAmount: number;
  notes?: string;
}