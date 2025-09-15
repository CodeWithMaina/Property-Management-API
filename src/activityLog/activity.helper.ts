import { activityActionEnum } from "../drizzle/schema";

export const ActivityAction = {
  create: activityActionEnum.enumValues[0],
  update: activityActionEnum.enumValues[1],
  delete: activityActionEnum.enumValues[2],
  statusChange: activityActionEnum.enumValues[3],
  assign: activityActionEnum.enumValues[4],
  unassign: activityActionEnum.enumValues[5],
  comment: activityActionEnum.enumValues[6],
  payment: activityActionEnum.enumValues[7],
  issueInvoice: activityActionEnum.enumValues[8],
  voidInvoice: activityActionEnum.enumValues[9],
} as const;

/**
 * Type for activity action values
 */
export type ActivityActionType = typeof ActivityAction[keyof typeof ActivityAction];

/**
 * Common target tables for activity logging
 */
export const TargetTables = {
  USERS: 'users',
  ORGANIZATIONS: 'organizations',
  PROPERTIES: 'properties',
  UNITS: 'units',
  LEASES: 'leases',
  INVOICES: 'invoices',
  INVOICE_ITEMS: 'invoiceItems',
  PAYMENTS: 'payments',
  PAYMENT_ALLOCATIONS: 'paymentAllocations',
  RECEIPTS: 'receipts',
  MAINTENANCE_REQUESTS: 'maintenanceRequests',
  MAINTENANCE_COMMENTS: 'maintenanceComments',
  MAINTENANCE_ATTACHMENTS: 'maintenanceAttachments',
  AMENITIES: 'amenities',
  UNIT_AMENITIES: 'unitAmenities',
  PROPERTY_MANAGERS: 'propertyManagers',
  USER_ORGANIZATIONS: 'userOrganizations',
  USER_AUTH: 'userAuth',
  REFRESH_TOKENS: 'refreshTokens',
  ACTIVITY_LOGS: 'activityLogs',
} as const;

export type TargetTableType = typeof TargetTables[keyof typeof TargetTables];