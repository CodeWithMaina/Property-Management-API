import { unitAmenities, UnitAmenity } from './../../drizzle/schema';
// types/api-response.ts

import { ActivityLog, UnitStatusEnum } from "../../drizzle/schema";
import { Amenity, Invoice, InvoiceItem, Lease, MaintenanceAttachment, MaintenanceComment, MaintenanceRequest, Organization, Payment, PaymentAllocation, Property, PropertyManager, Receipt, Unit, User, UserOrganization } from "../../drizzle/schema";

/**
 * Standardized response format for all REST API endpoints.
 * @template T The type of the data payload on success.
 */
export interface ApiResponse<T = unknown> {
  /**
   * Indicates the success or failure of the operation.
   */
  success: boolean;

  /**
   * The primary data payload of the response. Null on failure.
   */
  data: T | null;

  /**
   * A human-readable message for the client/end-user.
   * Often used for success confirmations or error summaries.
   */
  message: string | null;

  /**
   * A unique error code for machine-readable error identification.
   * Null on success.
   */
  errorCode: string | null;

  /**
   * Detailed list of validation errors or field-specific issues.
   * Null if no errors or if error is not field-specific.
   */
  errors: ValidationError[] | null;

  /**
   * Metadata about the response, such as pagination info.
   */
  meta: MetaData | null;

  /**
   * UTC ISO timestamp of when the response was generated.
   */
  timestamp: string;
}

/**
 * Structure for validation or field-specific errors.
 */
export interface ValidationError {
  /**
   * The field path in the request that caused the error (e.g., 'email', 'address.postalCode').
   */
  field: string | null;
  /**
   * A specific error message for this field.
   */
  message: string;
  /**
   * A machine-readable code for this specific error (e.g., 'VALIDATION_UNIQUE', 'VALIDATION_REQUIRED').
   */
  code: string;
}

/**
 * Structure for paginated list responses.
 */
export interface MetaData {
  pagination?: {
    total: number;
    count: number; // number of items in the current page
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
  // Other metadata can be added here (e.g., filters applied, sorting)
  [key: string]: unknown;
}

// Entity-specific response types for better type safety
export interface UserResponse extends User {
  organizations?: UserOrganization[];
  managedProperties?: PropertyManager[];
}

export interface PropertyResponse extends Property {
  units?: Unit[];
  managers?: PropertyManager[];
  maintenanceRequests?: MaintenanceRequest[];
  leases?: Lease[];
}



export interface LeaseResponse extends Lease {
  organization?: Organization;
  property?: Property;
  unit?: Unit;
  tenant?: User;
  invoices?: Invoice[];
  payments?: Payment[];
}

export interface InvoiceResponse extends Invoice {
  organization?: Organization;
  lease?: Lease;
  items?: InvoiceItem[];
  allocations?: PaymentAllocation[];
}

export interface PaymentResponse extends Payment {
  organization?: Organization;
  lease?: Lease;
  receivedFrom?: User;
  receivedBy?: User;
  allocations?: PaymentAllocation[];
  receipt?: Receipt;
}

export interface MaintenanceRequestResponse extends MaintenanceRequest {
  organization?: Organization;
  property?: Property;
  unit?: Unit;
  createdBy?: User;
  assignedTo?: User;
  comments?: MaintenanceComment[];
  attachments?: MaintenanceAttachment[];
}

export interface ActivityLogResponse extends ActivityLog {
  organization?: Organization;
  actor?: User;
}

// Organization and User Organization specific response types
export interface OrganizationResponse extends Organization {
  userOrganizations?: UserOrganizationResponse[];
  properties?: PropertyResponse[];
}

export interface UserOrganizationResponse extends UserOrganization {
  user?: UserResponse;
  organization?: OrganizationResponse;
}

// Paginated response types
export interface PaginatedResponse<T> {
  data: T[];
  pagination: MetaData['pagination'];
}

export interface UnitResponse extends Unit {
  property?: Property;
  amenities?: Amenity[];
  leases?: Lease[];
  maintenanceRequests?: MaintenanceRequest[];
  unitAmenities?: UnitAmenity[];
}

export interface AmenityResponse {
  id: string;
  organizationId: string;
  name: string;
  description: string | null;
  createdAt: Date;
  organization?: {
    id: string;
    name: string;
    legalName?: string;
  };
  unitAmenities?: Array<{
    unit: {
      id: string;
      code: string;
      propertyId: string;
      property?: {
        id: string;
        name: string;
      };
    };
  }>;
}

// Add to the existing interface if it exists
// export interface ApiResponseTypes {
//   // ... existing types
//   AmenityResponse: AmenityResponse;
// }
