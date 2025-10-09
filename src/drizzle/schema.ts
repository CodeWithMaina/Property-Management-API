// schema.ts
import {
  pgTable,
  pgEnum,
  uuid,
  varchar,
  text,
  boolean,
  timestamp,
  integer,
  numeric,
  jsonb,
  primaryKey,
  uniqueIndex,
  index,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";

// ========== ENUMS ==========

/**
 * User role enumeration defining all possible user roles in the system
 */
export const userRoleEnum = pgEnum("userRoleEnum", [
  "tenant",
  "caretaker",
  "manager",
  "propertyOwner", 
  "admin",
  "superAdmin",
]);

/**
 * Unit status enumeration defining possible states of rental units
 */
export const unitStatusEnum = pgEnum("unitStatusEnum", [
  "vacant",
  "reserved",
  "occupied",
  "unavailable",
]);

/**
 * Lease status enumeration defining lifecycle states of lease agreements
 */
export const leaseStatusEnum = pgEnum("leaseStatusEnum", [
  "draft",
  "active",
  "pendingMoveIn",
  "ended",
  "terminated",
  "cancelled",
]);

/**
 * Invoice status enumeration defining states of financial invoices
 */
export const invoiceStatusEnum = pgEnum("invoiceStatusEnum", [
  "draft",
  "issued",
  "partiallyPaid",
  "paid",
  "void",
  "overdue",
]);

/**
 * Payment method enumeration defining supported payment methods
 */
export const paymentMethodEnum = pgEnum("paymentMethodEnum", [
  "cash",
  "mpesa",
  "bankTransfer",
  "card",
  "cheque",
  "other",
]);

/**
 * Payment status enumeration defining states of payment transactions
 */
export const paymentStatusEnum = pgEnum("paymentStatusEnum", [
  "pending",
  "completed",
  "failed",
  "refunded",
  "cancelled",
]);

/**
 * Maintenance request status enumeration defining workflow states
 */
export const maintenanceStatusEnum = pgEnum("maintenanceStatusEnum", [
  "open",
  "inProgress",
  "onHold",
  "resolved",
  "closed",
  "cancelled",
]);

/**
 * Priority level enumeration for maintenance requests and other items
 */
export const priorityEnum = pgEnum("priorityEnum", [
  "low",
  "medium",
  "high",
  "urgent",
]);

/**
 * Activity action enumeration defining all trackable user actions
 */
export const activityActionEnum = pgEnum("activityActionEnum", [
  "create",
  "update",
  "delete",
  "statusChange",
  "assign",
  "unassign",
  "comment",
  "payment",
  "issueInvoice",
  "voidInvoice",
  "login",
  "logout",
  "permissionChange",
]);

// ========== AUTHENTICATION TABLES ==========

/**
 * User authentication table storing credentials and verification data
 */
export const userAuth = pgTable(
  "userAuth",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("userId")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    email: varchar("email", { length: 320 }).notNull(),
    passwordHash: varchar("passwordHash", { length: 255 }).notNull(),
    isEmailVerified: boolean("isEmailVerified").notNull().default(false),
    lastLoginAt: timestamp("lastLoginAt", { withTimezone: true }),
    verificationToken: varchar("verificationToken", { length: 255 }),
    resetToken: text("resetToken"),
    resetTokenExpiresAt: timestamp("resetTokenExpiresAt", {
      withTimezone: true,
    }),
    mfaSecret: varchar("mfaSecret", { length: 255 }),
    mfaEnabled: boolean("mfaEnabled").notNull().default(false),
    createdAt: timestamp("createdAt", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updatedAt", { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (t) => [
    uniqueIndex("userAuth_email_unique").on(t.email),
    uniqueIndex("userAuth_userId_unique").on(t.userId),
    index("userAuth_verificationToken_index").on(t.verificationToken),
    index("userAuth_resetToken_index").on(t.resetToken),
  ]
);

/**
 * Refresh tokens table for maintaining user sessions
 */
export const refreshTokens = pgTable(
  "refreshTokens",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("userId")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    token: varchar("token", { length: 512 }).notNull(),
    deviceId: varchar("deviceId", { length: 255 }),
    userAgent: varchar("userAgent", { length: 512 }),
    ipAddress: varchar("ipAddress", { length: 45 }),
    expiresAt: timestamp("expiresAt", { withTimezone: true }).notNull(),
    isRevoked: boolean("isRevoked").notNull().default(false),
    revokedAt: timestamp("revokedAt", { withTimezone: true }),
    createdAt: timestamp("createdAt", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    uniqueIndex("refreshTokens_token_unique").on(t.token),
    index("refreshTokens_userId_index").on(t.userId),
    index("refreshTokens_deviceId_index").on(t.deviceId),
    index("refreshTokens_expiresAt_index").on(t.expiresAt),
    index("refreshTokens_isRevoked_index").on(t.isRevoked),
  ]
);

/**
 * MFA backup codes table for two-factor authentication fallback
 */
export const mfaBackupCodes = pgTable(
  "mfaBackupCodes",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("userId")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    code: varchar("code", { length: 16 }).notNull(),
    isUsed: boolean("isUsed").notNull().default(false),
    usedAt: timestamp("usedAt", { withTimezone: true }),
    createdAt: timestamp("createdAt", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    index("mfaBackupCodes_userId_index").on(t.userId),
    index("mfaBackupCodes_isUsed_index").on(t.isUsed),
  ]
);

/**
 * User invitation table for managing organization invites
 */
export const invites = pgTable(
  "invites",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    email: varchar("email", { length: 320 }).notNull(),
    organizationId: uuid("organizationId")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    role: userRoleEnum("role").notNull(),
    permissions: jsonb("permissions")
      .$type<Record<string, boolean | number | string>>()
      .default({}),
    invitedByUserId: uuid("invitedByUserId").references(() => users.id, {
      onDelete: "set null",
    }),
    token: varchar("token", { length: 255 }).notNull(),
    expiresAt: timestamp("expiresAt", { withTimezone: true }).notNull(),
    isUsed: boolean("isUsed").notNull().default(false),
    usedAt: timestamp("usedAt", { withTimezone: true }),
    createdAt: timestamp("createdAt", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    uniqueIndex("invites_token_unique").on(t.token),
    index("invites_email_index").on(t.email),
    index("invites_organizationId_index").on(t.organizationId),
    index("invites_expiresAt_index").on(t.expiresAt),
    index("invites_isUsed_index").on(t.isUsed),
  ]
);

// ========== CORE USER & ORGANIZATION TABLES ==========

/**
 * Main users table storing user profile information
 */
export const users = pgTable(
  "users",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    fullName: varchar("fullName", { length: 256 }).notNull(),
    email: varchar("email", { length: 320 }).notNull(),
    phone: varchar("phone", { length: 64 }),
    isActive: boolean("isActive").notNull().default(true),
    avatarUrl: varchar("avatarUrl", { length: 1024 }),
    metadata: jsonb("metadata").$type<Record<string, unknown>>().default({}),
    createdAt: timestamp("createdAt", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updatedAt", { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (t) => [
    uniqueIndex("users_email_unique").on(t.email),
    index("users_phone_index").on(t.phone),
  ]
);

/**
 * Organizations table for multi-tenant support
 */
export const organizations = pgTable(
  "organizations",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    name: varchar("name", { length: 256 }).notNull(),
    legalName: varchar("legalName", { length: 256 }),
    taxId: varchar("taxId", { length: 64 }),
    isActive: boolean("isActive").notNull().default(true),
    metadata: jsonb("metadata").$type<Record<string, unknown>>().default({}),
    createdAt: timestamp("createdAt", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updatedAt", { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (t) => [uniqueIndex("organizations_name_unique").on(t.name)]
);

/**
 * User-organization junction table with role and permissions
 */
export const userOrganizations = pgTable(
  "userOrganizations",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("userId")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    organizationId: uuid("organizationId")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    role: userRoleEnum("role").notNull().default("tenant"),
    isPrimary: boolean("isPrimary").notNull().default(false),
    permissions: jsonb("permissions")
      .$type<{
        // Property Management
        canManageProperties?: boolean;
        canCreateProperties?: boolean;
        canDeleteProperties?: boolean;
        maxProperties?: number;
        
        // Unit Management
        canManageUnits?: boolean;
        canCreateUnits?: boolean;
        canDeleteUnits?: boolean;
        
        // Lease Management
        canManageLeases?: boolean;
        canCreateLeases?: boolean;
        canTerminateLeases?: boolean;
        
        // Tenant Management
        canManageTenants?: boolean;
        canInviteTenants?: boolean;
        canRemoveTenants?: boolean;
        
        // Financial Management
        canManageInvoices?: boolean;
        canIssueInvoices?: boolean;
        canVoidInvoices?: boolean;
        canManagePayments?: boolean;
        canRecordPayments?: boolean;
        canViewFinancialReports?: boolean;
        
        // Maintenance Management
        canManageMaintenance?: boolean;
        canCreateMaintenance?: boolean;
        canAssignMaintenance?: boolean;
        canApproveMaintenanceCosts?: boolean;
        
        // User Management
        canManageUsers?: boolean;
        canInviteUsers?: boolean;
        canRemoveUsers?: boolean;
        canChangeUserRoles?: boolean;
        
        // System Access
        canViewAuditLogs?: boolean;
        canManageOrganizationSettings?: boolean;
      }>()
      .default({}),
    createdAt: timestamp("createdAt", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updatedAt", { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (t) => [
    uniqueIndex("userOrganizations_userId_organizationId_unique").on(
      t.userId,
      t.organizationId
    ),
    index("userOrganizations_role_index").on(t.role),
    index("userOrganizations_isPrimary_index").on(t.isPrimary),
  ]
);

/**
 * Organization settings table for configuration and feature flags
 */
export const organizationSettings = pgTable(
  "organizationSettings",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    organizationId: uuid("organizationId")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    // Manager-specific settings
    managerCanCreateProperties: boolean("managerCanCreateProperties")
      .notNull()
      .default(true),
    managerCanDeleteProperties: boolean("managerCanDeleteProperties")
      .notNull()
      .default(false),
    managerCanInviteUsers: boolean("managerCanInviteUsers")
      .notNull()
      .default(true),
    managerMaxProperties: integer("managerMaxProperties"),
    // Security settings
    mfaRequired: boolean("mfaRequired").default(false),
    // Global organization settings
    defaultCurrency: varchar("defaultCurrency", { length: 3 }).default("KES"),
    timezone: varchar("timezone", { length: 64 }).default("Africa/Nairobi"),
    invoiceDueDays: integer("invoiceDueDays").default(30),
    lateFeeEnabled: boolean("lateFeeEnabled").default(true),
    lateFeePercent: numeric("lateFeePercent", { precision: 5, scale: 2 }).default("5.00"),
    createdAt: timestamp("createdAt", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updatedAt", { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (t) => [
    uniqueIndex("organizationSettings_organizationId_unique").on(
      t.organizationId
    ),
  ]
);

/**
 * Permission templates for reusable permission sets
 */
export const permissionTemplates = pgTable(
  "permissionTemplates",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    name: varchar("name", { length: 128 }).notNull(),
    description: text("description"),
    permissions: jsonb("permissions")
      .$type<Record<string, boolean | number | string>>()
      .notNull()
      .default({}),
    isSystem: boolean("isSystem").notNull().default(false),
    organizationId: uuid("organizationId").references(() => organizations.id, {
      onDelete: "cascade",
    }),
    createdAt: timestamp("createdAt", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updatedAt", { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (t) => [
    uniqueIndex("permissionTemplates_name_organizationId_unique").on(
      t.name,
      t.organizationId
    ),
    index("permissionTemplates_organizationId_index").on(t.organizationId),
  ]
);

// ========== PROPERTY MANAGEMENT TABLES ==========

/**
 * Properties table storing real estate property information
 */
export const properties = pgTable(
  "properties",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    organizationId: uuid("organizationId")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    name: varchar("name", { length: 256 }).notNull(),
    description: text("description"),
    addressLine1: varchar("addressLine1", { length: 256 }),
    addressLine2: varchar("addressLine2", { length: 256 }),
    city: varchar("city", { length: 128 }),
    state: varchar("state", { length: 128 }),
    postalCode: varchar("postalCode", { length: 32 }),
    country: varchar("country", { length: 128 }),
    timezone: varchar("timezone", { length: 64 }),
    isActive: boolean("isActive").notNull().default(true),
    createdByUserId: uuid("createdByUserId").references(() => users.id, {
      onDelete: "set null",
    }),
    metadata: jsonb("metadata").$type<Record<string, unknown>>().default({}),
    createdAt: timestamp("createdAt", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updatedAt", { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (t) => [
    uniqueIndex("properties_organizationId_name_unique").on(
      t.organizationId,
      t.name
    ),
    index("properties_organizationId_index").on(t.organizationId),
    index("properties_createdByUserId_index").on(t.createdByUserId),
  ]
);

/**
 * Property managers junction table for property-level user assignments
 */
export const propertyManagers = pgTable(
  "propertyManagers",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    propertyId: uuid("propertyId")
      .notNull()
      .references(() => properties.id, { onDelete: "cascade" }),
    userId: uuid("userId")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    role: userRoleEnum("role").notNull().default("manager"),
    permissions: jsonb("permissions")
      .$type<{
        canManageUnits?: boolean;
        canManageLeases?: boolean;
        canManageMaintenance?: boolean;
        canViewFinancials?: boolean;
      }>()
      .default({}),
    createdAt: timestamp("createdAt", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updatedAt", { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (t) => [
    uniqueIndex("propertyManagers_propertyId_userId_unique").on(
      t.propertyId,
      t.userId
    ),
    index("propertyManagers_userId_index").on(t.userId),
  ]
);

/**
 * Units table storing individual rental units within properties
 */
export const units = pgTable(
  "units",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    propertyId: uuid("propertyId")
      .notNull()
      .references(() => properties.id, { onDelete: "cascade" }),
    code: varchar("code", { length: 64 }).notNull(),
    floor: integer("floor"),
    bedrooms: integer("bedrooms").notNull().default(0),
    bathrooms: integer("bathrooms").notNull().default(0),
    sizeSqm: numeric("sizeSqm", { precision: 10, scale: 2 }),
    baseRent: numeric("baseRent", { precision: 12, scale: 2 })
      .notNull()
      .default("0"),
    status: unitStatusEnum("status").notNull().default("vacant"),
    isActive: boolean("isActive").notNull().default(true),
    metadata: jsonb("metadata").$type<Record<string, unknown>>().default({}),
    createdAt: timestamp("createdAt", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updatedAt", { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (t) => [
    uniqueIndex("units_propertyId_code_unique").on(t.propertyId, t.code),
    index("units_propertyId_index").on(t.propertyId),
    index("units_status_index").on(t.status),
  ]
);

/**
 * Amenities table for property and unit features
 */
export const amenities = pgTable(
  "amenities",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    organizationId: uuid("organizationId")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    name: varchar("name", { length: 128 }).notNull(),
    description: text("description"),
    createdAt: timestamp("createdAt", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    uniqueIndex("amenities_organizationId_name_unique").on(
      t.organizationId,
      t.name
    ),
  ]
);

/**
 * Unit-amenities junction table for unit feature mapping
 */
export const unitAmenities = pgTable(
  "unitAmenities",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    unitId: uuid("unitId")
      .notNull()
      .references(() => units.id, { onDelete: "cascade" }),
    amenityId: uuid("amenityId")
      .notNull()
      .references(() => amenities.id, { onDelete: "cascade" }),
    createdAt: timestamp("createdAt", { withTimezone: true })
      .notNull()
      .defaultNow(),
    metadata: jsonb("metadata").$type<Record<string, unknown>>().default({}),
  },
  (t) => [
    uniqueIndex("unitAmenities_unitId_amenityId_unique").on(
      t.unitId,
      t.amenityId
    ),
  ]
);

// ========== LEASE MANAGEMENT TABLES ==========

/**
 * Leases table storing rental agreement information
 */
export const leases = pgTable(
  "leases",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    organizationId: uuid("organizationId")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    propertyId: uuid("propertyId")
      .notNull()
      .references(() => properties.id, { onDelete: "restrict" }),
    unitId: uuid("unitId")
      .notNull()
      .references(() => units.id, { onDelete: "restrict" }),
    tenantUserId: uuid("tenantUserId")
      .notNull()
      .references(() => users.id, { onDelete: "restrict" }),
    status: leaseStatusEnum("status").notNull().default("draft"),
    startDate: timestamp("startDate", { withTimezone: true }).notNull(),
    endDate: timestamp("endDate", { withTimezone: true }),
    rentAmount: numeric("rentAmount", { precision: 12, scale: 2 }).notNull(),
    depositAmount: numeric("depositAmount", { precision: 12, scale: 2 })
      .notNull()
      .default("0"),
    dueDayOfMonth: integer("dueDayOfMonth").notNull().default(1),
    billingCurrency: varchar("billingCurrency", { length: 3 })
      .notNull()
      .default("KES"),
    lateFeePercent: numeric("lateFeePercent", {
      precision: 5,
      scale: 2,
    }).default("0"),
    notes: text("notes"),
    metadata: jsonb("metadata").$type<Record<string, unknown>>().default({}),
    createdAt: timestamp("createdAt", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updatedAt", { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (t) => [
    index("leases_unitId_active_index").on(t.unitId, t.status),
    index("leases_organizationId_index").on(t.organizationId),
    index("leases_tenantUserId_index").on(t.tenantUserId),
  ]
);

// ========== FINANCIAL MANAGEMENT TABLES ==========

/**
 * Invoices table for rent and other charge billing
 */
export const invoices = pgTable(
  "invoices",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    organizationId: uuid("organizationId")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    leaseId: uuid("leaseId")
      .notNull()
      .references(() => leases.id, { onDelete: "cascade" }),
    invoiceNumber: varchar("invoiceNumber", { length: 64 }).notNull(),
    status: invoiceStatusEnum("status").notNull().default("issued"),
    issueDate: timestamp("issueDate", { withTimezone: true })
      .notNull()
      .defaultNow(),
    dueDate: timestamp("dueDate", { withTimezone: true }).notNull(),
    currency: varchar("currency", { length: 3 }).notNull().default("KES"),
    subtotalAmount: numeric("subtotalAmount", { precision: 12, scale: 2 })
      .notNull()
      .default("0"),
    taxAmount: numeric("taxAmount", { precision: 12, scale: 2 })
      .notNull()
      .default("0"),
    totalAmount: numeric("totalAmount", { precision: 12, scale: 2 })
      .notNull()
      .default("0"),
    balanceAmount: numeric("balanceAmount", { precision: 12, scale: 2 })
      .notNull()
      .default("0"),
    notes: text("notes"),
    metadata: jsonb("metadata").$type<Record<string, unknown>>().default({}),
    createdAt: timestamp("createdAt", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updatedAt", { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (t) => [
    uniqueIndex("invoices_organizationId_invoiceNumber_unique").on(
      t.organizationId,
      t.invoiceNumber
    ),
    index("invoices_leaseId_index").on(t.leaseId),
    index("invoices_status_index").on(t.status),
    index("invoices_dueDate_index").on(t.dueDate),
  ]
);

/**
 * Invoice line items for detailed billing breakdown
 */
export const invoiceItems = pgTable(
  "invoiceItems",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    invoiceId: uuid("invoiceId")
      .notNull()
      .references(() => invoices.id, { onDelete: "cascade" }),
    description: varchar("description", { length: 256 }).notNull(),
    quantity: numeric("quantity", { precision: 12, scale: 2 })
      .notNull()
      .default("1"),
    unitPrice: numeric("unitPrice", { precision: 12, scale: 2 })
      .notNull()
      .default("0"),
    lineTotal: numeric("lineTotal", { precision: 12, scale: 2 })
      .notNull()
      .default("0"),
    metadata: jsonb("metadata").$type<Record<string, unknown>>().default({}),
  },
  (t) => [index("invoiceItems_invoiceId_index").on(t.invoiceId)]
);

/**
 * Payments table for tracking rent and other payments
 */
export const payments = pgTable(
  "payments",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    organizationId: uuid("organizationId")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    leaseId: uuid("leaseId").references(() => leases.id, {
      onDelete: "set null",
    }),
    receivedFromUserId: uuid("receivedFromUserId").references(() => users.id, {
      onDelete: "set null",
    }),
    receivedByUserId: uuid("receivedByUserId").references(() => users.id, {
      onDelete: "set null",
    }),
    method: paymentMethodEnum("method").notNull().default("cash"),
    status: paymentStatusEnum("status").notNull().default("completed"),
    amount: numeric("amount", { precision: 12, scale: 2 }).notNull(),
    currency: varchar("currency", { length: 3 }).notNull().default("KES"),
    referenceCode: varchar("referenceCode", { length: 128 }),
    narrative: varchar("narrative", { length: 512 }),
    receivedAt: timestamp("receivedAt", { withTimezone: true })
      .notNull()
      .defaultNow(),
    metadata: jsonb("metadata").$type<Record<string, unknown>>().default({}),
    createdAt: timestamp("createdAt", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updatedAt", { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (t) => [
    index("payments_organizationId_index").on(t.organizationId),
    index("payments_method_index").on(t.method),
    index("payments_status_index").on(t.status),
    index("payments_leaseId_index").on(t.leaseId),
    index("payments_referenceCode_index").on(t.referenceCode),
  ]
);

/**
 * Payment allocations for applying payments to specific invoices
 */
export const paymentAllocations = pgTable(
  "paymentAllocations",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    paymentId: uuid("paymentId")
      .notNull()
      .references(() => payments.id, { onDelete: "cascade" }),
    invoiceId: uuid("invoiceId")
      .notNull()
      .references(() => invoices.id, { onDelete: "cascade" }),
    amountApplied: numeric("amountApplied", {
      precision: 12,
      scale: 2,
    }).notNull(),
    createdAt: timestamp("createdAt", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    uniqueIndex("paymentAllocations_paymentId_invoiceId_unique").on(
      t.paymentId,
      t.invoiceId
    ),
    index("paymentAllocations_invoiceId_index").on(t.invoiceId),
  ]
);

/**
 * Receipts table for formal payment acknowledgment
 */
export const receipts = pgTable(
  "receipts",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    organizationId: uuid("organizationId")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    paymentId: uuid("paymentId")
      .notNull()
      .references(() => payments.id, { onDelete: "cascade" }),
    receiptNumber: varchar("receiptNumber", { length: 64 }).notNull(),
    issuedAt: timestamp("issuedAt", { withTimezone: true })
      .notNull()
      .defaultNow(),
    createdAt: timestamp("createdAt", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    uniqueIndex("receipts_organizationId_receiptNumber_unique").on(
      t.organizationId,
      t.receiptNumber
    ),
    uniqueIndex("receipts_paymentId_unique").on(t.paymentId),
  ]
);

// ========== MAINTENANCE MANAGEMENT TABLES ==========

/**
 * Maintenance requests table for tracking repair and maintenance issues
 */
export const maintenanceRequests = pgTable(
  "maintenanceRequests",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    organizationId: uuid("organizationId")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    propertyId: uuid("propertyId")
      .notNull()
      .references(() => properties.id, { onDelete: "cascade" }),
    unitId: uuid("unitId").references(() => units.id, { onDelete: "set null" }),
    createdByUserId: uuid("createdByUserId")
      .notNull()
      .references(() => users.id, { onDelete: "restrict" }),
    assignedToUserId: uuid("assignedToUserId").references(() => users.id, {
      onDelete: "set null",
    }),
    title: varchar("title", { length: 256 }).notNull(),
    description: text("description"),
    status: maintenanceStatusEnum("status").notNull().default("open"),
    priority: priorityEnum("priority").notNull().default("medium"),
    scheduledAt: timestamp("scheduledAt", { withTimezone: true }),
    resolvedAt: timestamp("resolvedAt", { withTimezone: true }),
    costAmount: numeric("costAmount", { precision: 12, scale: 2 }).default("0"),
    metadata: jsonb("metadata").$type<Record<string, unknown>>().default({}),
    createdAt: timestamp("createdAt", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updatedAt", { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (t) => [
    index("maintenanceRequests_organizationId_index").on(t.organizationId),
    index("maintenanceRequests_propertyId_index").on(t.propertyId),
    index("maintenanceRequests_status_index").on(t.status),
    index("maintenanceRequests_assignedToUserId_index").on(t.assignedToUserId),
    index("maintenanceRequests_priority_index").on(t.priority),
  ]
);

/**
 * Maintenance comments for request communication and updates
 */
export const maintenanceComments = pgTable(
  "maintenanceComments",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    maintenanceRequestId: uuid("maintenanceRequestId")
      .notNull()
      .references(() => maintenanceRequests.id, { onDelete: "cascade" }),
    authorUserId: uuid("authorUserId")
      .notNull()
      .references(() => users.id, { onDelete: "restrict" }),
    body: text("body").notNull(),
    createdAt: timestamp("createdAt", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    index("maintenanceComments_maintenanceRequestId_index").on(
      t.maintenanceRequestId
    ),
  ]
);

/**
 * Maintenance attachments for supporting documents and images
 */
export const maintenanceAttachments = pgTable(
  "maintenanceAttachments",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    maintenanceRequestId: uuid("maintenanceRequestId")
      .notNull()
      .references(() => maintenanceRequests.id, { onDelete: "cascade" }),
    fileUrl: varchar("fileUrl", { length: 1024 }).notNull(),
    fileName: varchar("fileName", { length: 256 }),
    contentType: varchar("contentType", { length: 128 }),
    sizeBytes: integer("sizeBytes"),
    createdAt: timestamp("createdAt", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    index("maintenanceAttachments_maintenanceRequestId_index").on(
      t.maintenanceRequestId
    ),
  ]
);

// ========== AUDIT & ACTIVITY LOGGING ==========

/**
 * Activity logs table for comprehensive audit trail
 */
export const activityLogs = pgTable(
  "activityLogs",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    organizationId: uuid("organizationId").references(() => organizations.id, {
      onDelete: "set null",
    }),
    actorUserId: uuid("actorUserId").references(() => users.id, {
      onDelete: "set null",
    }),
    action: activityActionEnum("action").notNull(),
    targetTable: varchar("targetTable", { length: 128 }).notNull(),
    targetId: varchar("targetId", { length: 64 }).notNull(),
    description: varchar("description", { length: 512 }),
    changes: jsonb("changes").$type<Record<string, unknown>>(),
    ipAddress: varchar("ipAddress", { length: 64 }),
    userAgent: varchar("userAgent", { length: 256 }),
    createdAt: timestamp("createdAt", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    index("activityLogs_organizationId_index").on(t.organizationId),
    index("activityLogs_actorUserId_index").on(t.actorUserId),
    index("activityLogs_target_index").on(t.targetTable, t.targetId),
    index("activityLogs_action_index").on(t.action),
    index("activityLogs_createdAt_index").on(t.createdAt),
  ]
);

// ========== DATABASE RELATIONS ==========

// User Relations
export const usersRelations = relations(users, ({ many }) => ({
  userAuth: many(userAuth),
  refreshTokens: many(refreshTokens),
  mfaBackupCodes: many(mfaBackupCodes),
  userOrganizations: many(userOrganizations),
  propertyManagers: many(propertyManagers),
  maintenanceRequestsCreated: many(maintenanceRequests, {
    relationName: "createdByUser",
  }),
  maintenanceRequestsAssigned: many(maintenanceRequests, {
    relationName: "assignedToUser",
  }),
  maintenanceComments: many(maintenanceComments),
  leases: many(leases),
  paymentsReceived: many(payments, { relationName: "receivedFromUser" }),
  paymentsRecorded: many(payments, { relationName: "receivedByUser" }),
  activityLogs: many(activityLogs),
  invitesSent: many(invites, { relationName: "invitedByUser" }),
}));

// UserAuth Relations
export const userAuthRelations = relations(userAuth, ({ one }) => ({
  user: one(users, {
    fields: [userAuth.userId],
    references: [users.id],
  }),
}));

// RefreshTokens Relations
export const refreshTokensRelations = relations(refreshTokens, ({ one }) => ({
  user: one(users, {
    fields: [refreshTokens.userId],
    references: [users.id],
  }),
}));

// MfaBackupCodes Relations
export const mfaBackupCodesRelations = relations(mfaBackupCodes, ({ one }) => ({
  user: one(users, {
    fields: [mfaBackupCodes.userId],
    references: [users.id],
  }),
}));

// Invites Relations
export const invitesRelations = relations(invites, ({ one }) => ({
  organization: one(organizations, {
    fields: [invites.organizationId],
    references: [organizations.id],
  }),
  invitedByUser: one(users, {
    fields: [invites.invitedByUserId],
    references: [users.id],
    relationName: "invitedByUser",
  }),
}));

// Organization Relations
export const organizationsRelations = relations(organizations, ({ many, one }) => ({
  userOrganizations: many(userOrganizations),
  organizationSettings: one(organizationSettings),
  permissionTemplates: many(permissionTemplates),
  properties: many(properties),
  leases: many(leases),
  invoices: many(invoices),
  payments: many(payments),
  receipts: many(receipts),
  maintenanceRequests: many(maintenanceRequests),
  activityLogs: many(activityLogs),
  invites: many(invites),
  amenities: many(amenities),
}));

// UserOrganizations Relations
export const userOrganizationsRelations = relations(
  userOrganizations,
  ({ one }) => ({
    user: one(users, {
      fields: [userOrganizations.userId],
      references: [users.id],
    }),
    organization: one(organizations, {
      fields: [userOrganizations.organizationId],
      references: [organizations.id],
    }),
  })
);

// OrganizationSettings Relations
export const organizationSettingsRelations = relations(
  organizationSettings,
  ({ one }) => ({
    organization: one(organizations, {
      fields: [organizationSettings.organizationId],
      references: [organizations.id],
    }),
  })
);

// PermissionTemplates Relations
export const permissionTemplatesRelations = relations(
  permissionTemplates,
  ({ one }) => ({
    organization: one(organizations, {
      fields: [permissionTemplates.organizationId],
      references: [organizations.id],
    }),
  })
);

// Property Relations
export const propertiesRelations = relations(properties, ({ many, one }) => ({
  organization: one(organizations, {
    fields: [properties.organizationId],
    references: [organizations.id],
  }),
  createdByUser: one(users, {
    fields: [properties.createdByUserId],
    references: [users.id],
  }),
  propertyManagers: many(propertyManagers),
  units: many(units),
  leases: many(leases),
  maintenanceRequests: many(maintenanceRequests),
}));

// PropertyManagers Relations
export const propertyManagersRelations = relations(
  propertyManagers,
  ({ one }) => ({
    property: one(properties, {
      fields: [propertyManagers.propertyId],
      references: [properties.id],
    }),
    user: one(users, {
      fields: [propertyManagers.userId],
      references: [users.id],
    }),
  })
);

// Unit Relations
export const unitsRelations = relations(units, ({ many, one }) => ({
  property: one(properties, {
    fields: [units.propertyId],
    references: [properties.id],
  }),
  unitAmenities: many(unitAmenities),
  leases: many(leases),
  maintenanceRequests: many(maintenanceRequests),
}));

// Amenities Relations
export const amenitiesRelations = relations(amenities, ({ many, one }) => ({
  organization: one(organizations, {
    fields: [amenities.organizationId],
    references: [organizations.id],
  }),
  unitAmenities: many(unitAmenities),
}));

// UnitAmenities Relations
export const unitAmenitiesRelations = relations(unitAmenities, ({ one }) => ({
  unit: one(units, {
    fields: [unitAmenities.unitId],
    references: [units.id],
  }),
  amenity: one(amenities, {
    fields: [unitAmenities.amenityId],
    references: [amenities.id],
  }),
}));

// Lease Relations
export const leasesRelations = relations(leases, ({ many, one }) => ({
  organization: one(organizations, {
    fields: [leases.organizationId],
    references: [organizations.id],
  }),
  property: one(properties, {
    fields: [leases.propertyId],
    references: [properties.id],
  }),
  unit: one(units, {
    fields: [leases.unitId],
    references: [units.id],
  }),
  tenantUser: one(users, {
    fields: [leases.tenantUserId],
    references: [users.id],
  }),
  invoices: many(invoices),
  payments: many(payments),
}));

// Invoice Relations
export const invoicesRelations = relations(invoices, ({ many, one }) => ({
  organization: one(organizations, {
    fields: [invoices.organizationId],
    references: [organizations.id],
  }),
  lease: one(leases, {
    fields: [invoices.leaseId],
    references: [leases.id],
  }),
  invoiceItems: many(invoiceItems),
  paymentAllocations: many(paymentAllocations),
}));

// InvoiceItems Relations
export const invoiceItemsRelations = relations(invoiceItems, ({ one }) => ({
  invoice: one(invoices, {
    fields: [invoiceItems.invoiceId],
    references: [invoices.id],
  }),
}));

// Payment Relations
export const paymentsRelations = relations(payments, ({ many, one }) => ({
  organization: one(organizations, {
    fields: [payments.organizationId],
    references: [organizations.id],
  }),
  lease: one(leases, {
    fields: [payments.leaseId],
    references: [leases.id],
  }),
  receivedFromUser: one(users, {
    fields: [payments.receivedFromUserId],
    references: [users.id],
    relationName: "receivedFromUser",
  }),
  receivedByUser: one(users, {
    fields: [payments.receivedByUserId],
    references: [users.id],
    relationName: "receivedByUser",
  }),
  paymentAllocations: many(paymentAllocations),
  receipts: many(receipts),
}));

// PaymentAllocations Relations
export const paymentAllocationsRelations = relations(
  paymentAllocations,
  ({ one }) => ({
    payment: one(payments, {
      fields: [paymentAllocations.paymentId],
      references: [payments.id],
    }),
    invoice: one(invoices, {
      fields: [paymentAllocations.invoiceId],
      references: [invoices.id],
    }),
  })
);

// Receipt Relations
export const receiptsRelations = relations(receipts, ({ one }) => ({
  organization: one(organizations, {
    fields: [receipts.organizationId],
    references: [organizations.id],
  }),
  payment: one(payments, {
    fields: [receipts.paymentId],
    references: [payments.id],
  }),
}));

// MaintenanceRequest Relations
export const maintenanceRequestsRelations = relations(
  maintenanceRequests,
  ({ many, one }) => ({
    organization: one(organizations, {
      fields: [maintenanceRequests.organizationId],
      references: [organizations.id],
    }),
    property: one(properties, {
      fields: [maintenanceRequests.propertyId],
      references: [properties.id],
    }),
    unit: one(units, {
      fields: [maintenanceRequests.unitId],
      references: [units.id],
    }),
    createdByUser: one(users, {
      fields: [maintenanceRequests.createdByUserId],
      references: [users.id],
      relationName: "createdByUser",
    }),
    assignedToUser: one(users, {
      fields: [maintenanceRequests.assignedToUserId],
      references: [users.id],
      relationName: "assignedToUser",
    }),
    maintenanceComments: many(maintenanceComments),
    maintenanceAttachments: many(maintenanceAttachments),
  })
);

// MaintenanceComments Relations
export const maintenanceCommentsRelations = relations(
  maintenanceComments,
  ({ one }) => ({
    maintenanceRequest: one(maintenanceRequests, {
      fields: [maintenanceComments.maintenanceRequestId],
      references: [maintenanceRequests.id],
    }),
    authorUser: one(users, {
      fields: [maintenanceComments.authorUserId],
      references: [users.id],
    }),
  })
);

// MaintenanceAttachments Relations
export const maintenanceAttachmentsRelations = relations(
  maintenanceAttachments,
  ({ one }) => ({
    maintenanceRequest: one(maintenanceRequests, {
      fields: [maintenanceAttachments.maintenanceRequestId],
      references: [maintenanceRequests.id],
    }),
  })
);

// ActivityLogs Relations
export const activityLogsRelations = relations(activityLogs, ({ one }) => ({
  organization: one(organizations, {
    fields: [activityLogs.organizationId],
    references: [organizations.id],
  }),
  actorUser: one(users, {
    fields: [activityLogs.actorUserId],
    references: [users.id],
  }),
}));

// ========== INFERRED TYPES ==========

// Core Types
export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;

export type Organization = typeof organizations.$inferSelect;
export type NewOrganization = typeof organizations.$inferInsert;

export type UserOrganization = typeof userOrganizations.$inferSelect;
export type NewUserOrganization = typeof userOrganizations.$inferInsert;

export type Property = typeof properties.$inferSelect;
export type NewProperty = typeof properties.$inferInsert;

export type Unit = typeof units.$inferSelect;
export type NewUnit = typeof units.$inferInsert;

export type Lease = typeof leases.$inferSelect;
export type NewLease = typeof leases.$inferInsert;

export type Invoice = typeof invoices.$inferSelect;
export type NewInvoice = typeof invoices.$inferInsert;

export type Payment = typeof payments.$inferSelect;
export type NewPayment = typeof payments.$inferInsert;

export type MaintenanceRequest = typeof maintenanceRequests.$inferSelect;
export type NewMaintenanceRequest = typeof maintenanceRequests.$inferInsert;

export type ActivityLog = typeof activityLogs.$inferSelect;
export type NewActivityLog = typeof activityLogs.$inferInsert;

// Authentication Types
export type UserAuth = typeof userAuth.$inferSelect;
export type NewUserAuth = typeof userAuth.$inferInsert;

export type RefreshToken = typeof refreshTokens.$inferSelect;
export type NewRefreshToken = typeof refreshTokens.$inferInsert;

export type MfaBackupCode = typeof mfaBackupCodes.$inferSelect;
export type NewMfaBackupCode = typeof mfaBackupCodes.$inferInsert;

export type Invite = typeof invites.$inferSelect;
export type NewInvite = typeof invites.$inferInsert;

// Organization Types
export type OrganizationSettings = typeof organizationSettings.$inferSelect;
export type NewOrganizationSettings = typeof organizationSettings.$inferInsert;

export type PermissionTemplate = typeof permissionTemplates.$inferSelect;
export type NewPermissionTemplate = typeof permissionTemplates.$inferInsert;

// Property Management Types
export type PropertyManager = typeof propertyManagers.$inferSelect;
export type NewPropertyManager = typeof propertyManagers.$inferInsert;

export type Amenity = typeof amenities.$inferSelect;
export type NewAmenity = typeof amenities.$inferInsert;

export type UnitAmenity = typeof unitAmenities.$inferSelect;
export type NewUnitAmenity = typeof unitAmenities.$inferInsert;

// Financial Types
export type InvoiceItem = typeof invoiceItems.$inferSelect;
export type NewInvoiceItem = typeof invoiceItems.$inferInsert;

export type PaymentAllocation = typeof paymentAllocations.$inferSelect;
export type NewPaymentAllocation = typeof paymentAllocations.$inferInsert;

export type Receipt = typeof receipts.$inferSelect;
export type NewReceipt = typeof receipts.$inferInsert;

// Maintenance Types
export type MaintenanceComment = typeof maintenanceComments.$inferSelect;
export type NewMaintenanceComment = typeof maintenanceComments.$inferInsert;

export type MaintenanceAttachment = typeof maintenanceAttachments.$inferSelect;
export type NewMaintenanceAttachment = typeof maintenanceAttachments.$inferInsert;

// Permission Types
export type UserOrganizationPermissions = NonNullable<
  UserOrganization["permissions"]
>;

export type PropertyManagerPermissions = NonNullable<
  PropertyManager["permissions"]
>;

// ========== ENUM TYPES ==========

export type UserRole = (typeof userRoleEnum.enumValues)[number];
export type UnitStatus = (typeof unitStatusEnum.enumValues)[number];
export type LeaseStatus = (typeof leaseStatusEnum.enumValues)[number];
export type InvoiceStatus = (typeof invoiceStatusEnum.enumValues)[number];
export type PaymentMethod = (typeof paymentMethodEnum.enumValues)[number];
export type PaymentStatus = (typeof paymentStatusEnum.enumValues)[number];
export type MaintenanceStatus = (typeof maintenanceStatusEnum.enumValues)[number];
export type Priority = (typeof priorityEnum.enumValues)[number];
export type ActivityAction = (typeof activityActionEnum.enumValues)[number];