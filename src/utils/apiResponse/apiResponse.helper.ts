// utils/response-helper.ts

import { MaintenanceAttachment, MaintenanceComment } from '../../drizzle/schema';
import { 
  ApiResponse, 
  MetaData, 
  ValidationError, 
  UserResponse,
  PropertyResponse,
  UnitResponse,
  LeaseResponse,
  InvoiceResponse,
  PaymentResponse,
  MaintenanceRequestResponse,
  PaginatedResponse,
  ActivityLogResponse,
  OrganizationResponse,
  UserOrganizationResponse,
  AmenityResponse
} from './apiResponse.types';

interface ResponseParams<T> {
  success: boolean;
  message?: string | null;
  data?: T | null;
  errorCode?: string | null;
  errors?: ValidationError[] | null;
  meta?: MetaData | null;
}

/**
 * Creates a standardized API response object.
 * @param params Parameters for constructing the response.
 * @returns A properly formatted ApiResponse object.
 */
export function createResponse<T>(params: ResponseParams<T>): ApiResponse<T> {
  const {
    success,
    message = null,
    data = null,
    errorCode = null,
    errors = null,
    meta = null,
  } = params;

  return {
    success,
    data,
    message,
    errorCode,
    errors,
    meta,
    timestamp: new Date().toISOString(),
  };
}

// Specific helpers for common scenarios
export function createSuccessResponse<T>(
  data: T,
  message: string = 'Operation successful.',
  meta: MetaData | null = null
): ApiResponse<T> {
  return createResponse<T>({
    success: true,
    message,
    data,
    meta,
  });
}

export function createErrorResponse(
  message: string,
  errorCode: string,
  errors: ValidationError[] | null = null
): ApiResponse<null> {
  return createResponse<null>({
    success: false,
    message,
    errorCode,
    errors,
    data: null,
  });
}

export function createPaginatedResponse<T>(
  data: T[],
  paginationInfo: MetaData['pagination'],
  message: string = 'Data retrieved successfully.',
  emptyMessage: string = 'No data found.'
): ApiResponse<T[]> {
  const finalMessage = data.length === 0 ? emptyMessage : message;
  
  return {
    success: true,
    message: finalMessage,
    data,
    errorCode: null,
    errors: null,
    meta: { pagination: paginationInfo },
    timestamp: new Date().toISOString(),
  };
}

// Helper to determine appropriate message based on data presence
function getDataMessage<T>(
  data: T[],
  successMessage: string,
  emptyMessage: string
): string {
  if (Array.isArray(data)) {
    return data.length === 0 ? emptyMessage : successMessage;
  }
  return successMessage;
}

// Entity-specific success response helpers
export function createUserResponse(
  user: UserResponse,
  message: string = 'User retrieved successfully.'
): ApiResponse<UserResponse> {
  return createSuccessResponse(user, message);
}

export function createUsersResponse(
  users: UserResponse[],
  pagination?: MetaData['pagination'],
  message: string = 'Users retrieved successfully.',
  emptyMessage: string = 'No users found.'
): ApiResponse<UserResponse[]> {
  const finalMessage = getDataMessage(users, message, emptyMessage);
  
  if (pagination) {
    return createPaginatedResponse(users, pagination, message, emptyMessage);
  }
  return createSuccessResponse(users, finalMessage);
}

export function createPropertyResponse(
  property: PropertyResponse,
  message: string = 'Property retrieved successfully.'
): ApiResponse<PropertyResponse> {
  return createSuccessResponse(property, message);
}

export function createPropertiesResponse(
  properties: PropertyResponse[],
  pagination?: MetaData['pagination'],
  message: string = 'Properties retrieved successfully.',
  emptyMessage: string = 'No properties found.'
): ApiResponse<PropertyResponse[]> {
  const finalMessage = getDataMessage(properties, message, emptyMessage);
  
  if (pagination) {
    return createPaginatedResponse(properties, pagination, message, emptyMessage);
  }
  return createSuccessResponse(properties, finalMessage);
}

export function createUnitResponse(
  unit: UnitResponse,
  message: string = 'Unit retrieved successfully.'
): ApiResponse<UnitResponse> {
  return createSuccessResponse(unit, message);
}

export function createUnitsResponse(
  units: UnitResponse[],
  pagination?: MetaData['pagination'],
  message: string = 'Units retrieved successfully.',
  emptyMessage: string = 'No units found.'
): ApiResponse<UnitResponse[]> {
  const finalMessage = getDataMessage(units, message, emptyMessage);
  
  if (pagination) {
    return createPaginatedResponse(units, pagination, message, emptyMessage);
  }
  return createSuccessResponse(units, finalMessage);
}

export function createInvoiceResponse(
  invoice: InvoiceResponse,
  message: string = 'Invoice retrieved successfully.'
): ApiResponse<InvoiceResponse> {
  return createSuccessResponse(invoice, message);
}

export function createInvoicesResponse(
  invoices: InvoiceResponse[],
  pagination?: MetaData['pagination'],
  message: string = 'Invoices retrieved successfully.',
  emptyMessage: string = 'No invoices found.'
): ApiResponse<InvoiceResponse[]> {
  const finalMessage = getDataMessage(invoices, message, emptyMessage);
  
  if (pagination) {
    return createPaginatedResponse(invoices, pagination, message, emptyMessage);
  }
  return createSuccessResponse(invoices, finalMessage);
}

export function createPaymentResponse(
  payment: PaymentResponse,
  message: string = 'Payment retrieved successfully.'
): ApiResponse<PaymentResponse> {
  return createSuccessResponse(payment, message);
}

export function createPaymentsResponse(
  payments: PaymentResponse[],
  pagination?: MetaData['pagination'],
  message: string = 'Payments retrieved successfully.',
  emptyMessage: string = 'No payments found.'
): ApiResponse<PaymentResponse[]> {
  const finalMessage = getDataMessage(payments, message, emptyMessage);
  
  if (pagination) {
    return createPaginatedResponse(payments, pagination, message, emptyMessage);
  }
  return createSuccessResponse(payments, finalMessage);
}

export function createActivityLogResponse(
  log: ActivityLogResponse,
  message: string = 'Activity log retrieved successfully.'
): ApiResponse<ActivityLogResponse> {
  return createSuccessResponse(log, message);
}

export function createActivityLogsResponse(
  logs: ActivityLogResponse[],
  pagination?: MetaData['pagination'],
  message: string = 'Activity logs retrieved successfully.',
  emptyMessage: string = 'No activity logs found.'
): ApiResponse<ActivityLogResponse[]> {
  const finalMessage = getDataMessage(logs, message, emptyMessage);
  
  if (pagination) {
    return createPaginatedResponse(logs, pagination, message, emptyMessage);
  }
  return createSuccessResponse(logs, finalMessage);
}

export function createOrganizationResponse(
  organization: OrganizationResponse,
  message: string = 'Organization retrieved successfully.'
): ApiResponse<OrganizationResponse> {
  return createSuccessResponse(organization, message);
}

export function createOrganizationsResponse(
  organizations: OrganizationResponse[],
  pagination?: MetaData['pagination'],
  message: string = 'Organizations retrieved successfully.',
  emptyMessage: string = 'No organizations found.'
): ApiResponse<OrganizationResponse[]> {
  const finalMessage = getDataMessage(organizations, message, emptyMessage);
  
  if (pagination) {
    return createPaginatedResponse(organizations, pagination, message, emptyMessage);
  }
  return createSuccessResponse(organizations, finalMessage);
}

export function createUserOrganizationResponse(
  userOrganization: UserOrganizationResponse,
  message: string = 'User organization retrieved successfully.'
): ApiResponse<UserOrganizationResponse> {
  return createSuccessResponse(userOrganization, message);
}

export function createUserOrganizationsResponse(
  userOrganizations: UserOrganizationResponse[],
  pagination?: MetaData['pagination'],
  message: string = 'User organizations retrieved successfully.',
  emptyMessage: string = 'No user organizations found.'
): ApiResponse<UserOrganizationResponse[]> {
  const finalMessage = getDataMessage(userOrganizations, message, emptyMessage);
  
  if (pagination) {
    return createPaginatedResponse(userOrganizations, pagination, message, emptyMessage);
  }
  return createSuccessResponse(userOrganizations, finalMessage);
}

export function createLeaseResponse(
  lease: LeaseResponse,
  message: string = 'Lease retrieved successfully.'
): ApiResponse<LeaseResponse> {
  return createSuccessResponse(lease, message);
}

export function createLeasesResponse(
  leases: LeaseResponse[],
  pagination?: MetaData['pagination'],
  message: string = 'Leases retrieved successfully.',
  emptyMessage: string = 'No leases found.'
): ApiResponse<LeaseResponse[]> {
  const finalMessage = getDataMessage(leases, message, emptyMessage);
  
  if (pagination) {
    return createPaginatedResponse(leases, pagination, message, emptyMessage);
  }
  return createSuccessResponse(leases, finalMessage);
}

export function createAmenityResponse(
  amenity: AmenityResponse,
  message: string = 'Amenity retrieved successfully.'
): ApiResponse<AmenityResponse> {
  return createSuccessResponse(amenity, message);
}

export function createAmenitiesResponse(
  amenities: AmenityResponse[],
  pagination?: MetaData['pagination'],
  message: string = 'Amenities retrieved successfully.',
  emptyMessage: string = 'No amenities found.'
): ApiResponse<AmenityResponse[]> {
  const finalMessage = getDataMessage(amenities, message, emptyMessage);
  
  if (pagination) {
    return createPaginatedResponse(amenities, pagination, message, emptyMessage);
  }
  return createSuccessResponse(amenities, finalMessage);
}

export const createMaintenanceRequestResponse = (
  data: MaintenanceRequestResponse,
  message: string = "Success"
): ApiResponse<MaintenanceRequestResponse> => {
  return {
    success: true,
    message,
    data,
    errorCode: null,
    errors: null,
    meta: null,
    timestamp: new Date().toISOString(),
  };
};

export const createMaintenanceRequestsResponse = (
  data: MaintenanceRequestResponse[],
  message: string = "Success",
  emptyMessage: string = "No maintenance requests found."
): ApiResponse<MaintenanceRequestResponse[]> => {
  const finalMessage = data.length === 0 ? emptyMessage : message;
  
  return {
    success: true,
    message: finalMessage,
    data,
    errorCode: null,
    errors: null,
    meta: null,
    timestamp: new Date().toISOString(),
  };
};

export const createMaintenanceCommentResponse = (
  data: MaintenanceComment,
  message: string = "Success"
): ApiResponse<MaintenanceComment> => {
  return {
    success: true,
    message,
    data,
    errorCode: null,
    errors: null,
    meta: null,
    timestamp: new Date().toISOString(),
  };
};

export const createMaintenanceAttachmentResponse = (
  data: MaintenanceAttachment,
  message: string = "Success"
): ApiResponse<MaintenanceAttachment> => {
  return {
    success: true,
    message,
    data,
    errorCode: null,
    errors: null,
    meta: null,
    timestamp: new Date().toISOString(),
  };
};