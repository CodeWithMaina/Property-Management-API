// utils/response-helper.ts

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
  ActivityLogResponse
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
  message: string = 'Data retrieved successfully.'
): ApiResponse<T[]> {
  return createResponse<T[]>({
    success: true,
    message,
    data,
    meta: { pagination: paginationInfo },
  });
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
  message: string = 'Users retrieved successfully.'
): ApiResponse<UserResponse[]> {
  if (pagination) {
    return createPaginatedResponse(users, pagination, message);
  }
  return createSuccessResponse(users, message);
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
  message: string = 'Properties retrieved successfully.'
): ApiResponse<PropertyResponse[]> {
  if (pagination) {
    return createPaginatedResponse(properties, pagination, message);
  }
  return createSuccessResponse(properties, message);
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
  message: string = 'Units retrieved successfully.'
): ApiResponse<UnitResponse[]> {
  if (pagination) {
    return createPaginatedResponse(units, pagination, message);
  }
  return createSuccessResponse(units, message);
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
  message: string = 'Leases retrieved successfully.'
): ApiResponse<LeaseResponse[]> {
  if (pagination) {
    return createPaginatedResponse(leases, pagination, message);
  }
  return createSuccessResponse(leases, message);
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
  message: string = 'Invoices retrieved successfully.'
): ApiResponse<InvoiceResponse[]> {
  if (pagination) {
    return createPaginatedResponse(invoices, pagination, message);
  }
  return createSuccessResponse(invoices, message);
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
  message: string = 'Payments retrieved successfully.'
): ApiResponse<PaymentResponse[]> {
  if (pagination) {
    return createPaginatedResponse(payments, pagination, message);
  }
  return createSuccessResponse(payments, message);
}

export function createMaintenanceRequestResponse(
  request: MaintenanceRequestResponse,
  message: string = 'Maintenance request retrieved successfully.'
): ApiResponse<MaintenanceRequestResponse> {
  return createSuccessResponse(request, message);
}

export function createMaintenanceRequestsResponse(
  requests: MaintenanceRequestResponse[],
  pagination?: MetaData['pagination'],
  message: string = 'Maintenance requests retrieved successfully.'
): ApiResponse<MaintenanceRequestResponse[]> {
  if (pagination) {
    return createPaginatedResponse(requests, pagination, message);
  }
  return createSuccessResponse(requests, message);
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
  message: string = 'Activity logs retrieved successfully.'
): ApiResponse<ActivityLogResponse[]> {
  if (pagination) {
    return createPaginatedResponse(logs, pagination, message);
  }
  return createSuccessResponse(logs, message);
}
