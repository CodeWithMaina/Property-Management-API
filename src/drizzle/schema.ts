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

// ---------- Enums (CamelCase) ----------
export const userRoleEnum = pgEnum("userRoleEnum", [
  "tenant",
  "caretaker",
  "admin",
  "superAdmin",
  "propertyOwner",
  "manager",
]);

export const unitStatusEnum = pgEnum("unitStatusEnum", [
  "vacant",
  "reserved",
  "occupied",
  "unavailable",
]);

export const leaseStatusEnum = pgEnum("leaseStatusEnum", [
  "draft",
  "active",
  "pendingMoveIn",
  "ended",
  "terminated",
  "cancelled",
]);

export const invoiceStatusEnum = pgEnum("invoiceStatusEnum", [
  "draft",
  "issued",
  "partiallyPaid",
  "paid",
  "void",
  "overdue",
]);

export const paymentMethodEnum = pgEnum("paymentMethodEnum", [
  "cash",
  "mpesa",
  "bankTransfer",
  "card",
  "cheque",
  "other",
]);

export const paymentStatusEnum = pgEnum("paymentStatusEnum", [
  "pending",
  "completed",
  "failed",
  "refunded",
  "cancelled",
]);

export const maintenanceStatusEnum = pgEnum("maintenanceStatusEnum", [
  "open",
  "inProgress",
  "onHold",
  "resolved",
  "closed",
  "cancelled",
]);

export const priorityEnum = pgEnum("priorityEnum", ["low", "medium", "high", "urgent"]);

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
]);

// ---------- Authentication Tables ----------
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
    resetToken: varchar("resetToken", { length: 255 }),
    resetTokenExpiresAt: timestamp("resetTokenExpiresAt", { withTimezone: true }),
    createdAt: timestamp("createdAt", { withTimezone: true }).notNull().defaultNow(),
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
    createdAt: timestamp("createdAt", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex("refreshTokens_token_unique").on(t.token),
    index("refreshTokens_userId_index").on(t.userId),
    index("refreshTokens_deviceId_index").on(t.deviceId),
    index("refreshTokens_expiresAt_index").on(t.expiresAt),
    index("refreshTokens_isRevoked_index").on(t.isRevoked),
  ]

);


export const invites = pgTable(
  "invites",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    email: varchar("email", { length: 320 }).notNull(),
    organizationId: uuid("organizationId")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    role: userRoleEnum("role").notNull(),
    invitedByUserId: uuid("invitedByUserId")
      .references(() => users.id, { onDelete: "set null" }),
    token: varchar("token", { length: 255 }).notNull(),
    expiresAt: timestamp("expiresAt", { withTimezone: true }).notNull(),
    isUsed: boolean("isUsed").notNull().default(false),
    usedAt: timestamp("usedAt", { withTimezone: true }),
    createdAt: timestamp("createdAt", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex("invites_token_unique").on(t.token),
    index("invites_email_index").on(t.email),
    index("invites_organizationId_index").on(t.organizationId),
    index("invites_expiresAt_index").on(t.expiresAt),
    index("invites_isUsed_index").on(t.isUsed),
  ]
);

// ---------- Core: Users & Organizations ----------
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
    createdAt: timestamp("createdAt", { withTimezone: true }).notNull().defaultNow(),
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

export const organizations = pgTable(
  "organizations",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    name: varchar("name", { length: 256 }).notNull(),
    legalName: varchar("legalName", { length: 256 }),
    taxId: varchar("taxId", { length: 64 }),
    isActive: boolean("isActive").notNull().default(true),
    metadata: jsonb("metadata").$type<Record<string, unknown>>().default({}),
    createdAt: timestamp("createdAt", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updatedAt", { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (t) => [
    uniqueIndex("organizations_name_unique").on(t.name),
  ]
);

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
    createdAt: timestamp("createdAt", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex("userOrganizations_userId_organizationId_unique").on(
      t.userId,
      t.organizationId
    ),
    index("userOrganizations_role_index").on(t.role),
  ]
);

// ---------- Properties, Units, Amenities ----------
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
    metadata: jsonb("metadata").$type<Record<string, unknown>>().default({}),
    createdAt: timestamp("createdAt", { withTimezone: true }).notNull().defaultNow(),
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
  ]
);

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
    role: userRoleEnum("role").notNull().default("manager"), // manager/caretaker/admin
    createdAt: timestamp("createdAt", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex("propertyManagers_propertyId_userId_unique").on(
      t.propertyId,
      t.userId
    ),
  ]
);

export const units = pgTable(
  "units",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    propertyId: uuid("propertyId")
      .notNull()
      .references(() => properties.id, { onDelete: "cascade" }),
    code: varchar("code", { length: 64 }).notNull(), // e.g., A-101
    floor: integer("floor"),
    bedrooms: integer("bedrooms").notNull().default(0),
    bathrooms: integer("bathrooms").notNull().default(0),
    sizeSqm: numeric("sizeSqm", { precision: 10, scale: 2 }),
    baseRent: numeric("baseRent", { precision: 12, scale: 2 }).notNull().default("0"),
    status: unitStatusEnum("status").notNull().default("vacant"),
    isActive: boolean("isActive").notNull().default(true),
    metadata: jsonb("metadata").$type<Record<string, unknown>>().default({}),
    createdAt: timestamp("createdAt", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updatedAt", { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (t) => [
    uniqueIndex("units_propertyId_code_unique").on(
      t.propertyId,
      t.code
    ),
    index("units_propertyId_index").on(t.propertyId),
    index("units_status_index").on(t.status),
  ]
);

export const amenities = pgTable(
  "amenities",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    organizationId: uuid("organizationId")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    name: varchar("name", { length: 128 }).notNull(),
    description: text("description"),
    createdAt: timestamp("createdAt", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex("amenities_organizationId_name_unique").on(
      t.organizationId,
      t.name
    ),
  ]
);

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
    createdAt: timestamp("createdAt", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex("unitAmenities_unitId_amenityId_unique").on(
      t.unitId,
      t.amenityId
    ),
  ]
);

// ---------- Leases ----------
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
    depositAmount: numeric("depositAmount", { precision: 12, scale: 2 }).notNull().default("0"),
    dueDayOfMonth: integer("dueDayOfMonth").notNull().default(1), // 1..28
    billingCurrency: varchar("billingCurrency", { length: 3 }).notNull().default("KES"),
    lateFeePercent: numeric("lateFeePercent", { precision: 5, scale: 2 }).default("0"),
    notes: text("notes"),
    metadata: jsonb("metadata").$type<Record<string, unknown>>().default({}),
    createdAt: timestamp("createdAt", { withTimezone: true }).notNull().defaultNow(),
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

// ---------- Invoicing & Payments ----------
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
    issueDate: timestamp("issueDate", { withTimezone: true }).notNull().defaultNow(),
    dueDate: timestamp("dueDate", { withTimezone: true }).notNull(),
    currency: varchar("currency", { length: 3 }).notNull().default("KES"),
    subtotalAmount: numeric("subtotalAmount", { precision: 12, scale: 2 }).notNull().default("0"),
    taxAmount: numeric("taxAmount", { precision: 12, scale: 2 }).notNull().default("0"),
    totalAmount: numeric("totalAmount", { precision: 12, scale: 2 }).notNull().default("0"),
    balanceAmount: numeric("balanceAmount", { precision: 12, scale: 2 }).notNull().default("0"),
    notes: text("notes"),
    metadata: jsonb("metadata").$type<Record<string, unknown>>().default({}),
    createdAt: timestamp("createdAt", { withTimezone: true }).notNull().defaultNow(),
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

export const invoiceItems = pgTable(
  "invoiceItems",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    invoiceId: uuid("invoiceId")
      .notNull()
      .references(() => invoices.id, { onDelete: "cascade" }),
    description: varchar("description", { length: 256 }).notNull(),
    quantity: numeric("quantity", { precision: 12, scale: 2 }).notNull().default("1"),
    unitPrice: numeric("unitPrice", { precision: 12, scale: 2 }).notNull().default("0"),
    lineTotal: numeric("lineTotal", { precision: 12, scale: 2 }).notNull().default("0"),
    metadata: jsonb("metadata").$type<Record<string, unknown>>().default({}),
  },
  (t) => [
    index("invoiceItems_invoiceId_index").on(t.invoiceId),
  ]
);

export const payments = pgTable(
  "payments",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    organizationId: uuid("organizationId")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    leaseId: uuid("leaseId")
      .references(() => leases.id, { onDelete: "set null" }),
    receivedFromUserId: uuid("receivedFromUserId")
      .references(() => users.id, { onDelete: "set null" }), // usually tenant
    receivedByUserId: uuid("receivedByUserId")
      .references(() => users.id, { onDelete: "set null" }), // staff
    method: paymentMethodEnum("method").notNull().default("cash"),
    status: paymentStatusEnum("status").notNull().default("completed"),
    amount: numeric("amount", { precision: 12, scale: 2 }).notNull(),
    currency: varchar("currency", { length: 3 }).notNull().default("KES"),
    referenceCode: varchar("referenceCode", { length: 128 }), // e.g., Mpesa code / cheque no.
    narrative: varchar("narrative", { length: 512 }),
    receivedAt: timestamp("receivedAt", { withTimezone: true }).notNull().defaultNow(),
    metadata: jsonb("metadata").$type<Record<string, unknown>>().default({}),
    createdAt: timestamp("createdAt", { withTimezone: true }).notNull().defaultNow(),
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

// Supports partial allocations across multiple invoices
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
    amountApplied: numeric("amountApplied", { precision: 12, scale: 2 }).notNull(),
    createdAt: timestamp("createdAt", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex("paymentAllocations_paymentId_invoiceId_unique").on(
      t.paymentId,
      t.invoiceId
    ),
    index("paymentAllocations_invoiceId_index").on(t.invoiceId),
  ]
);

// Optional: stable, human-facing receipt numbers
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
    issuedAt: timestamp("issuedAt", { withTimezone: true }).notNull().defaultNow(),
    createdAt: timestamp("createdAt", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex("receipts_organizationId_receiptNumber_unique").on(
      t.organizationId,
      t.receiptNumber
    ),
    uniqueIndex("receipts_paymentId_unique").on(t.paymentId),
  ]
);

// ---------- Maintenance ----------
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
    unitId: uuid("unitId")
      .references(() => units.id, { onDelete: "set null" }),
    createdByUserId: uuid("createdByUserId")
      .notNull()
      .references(() => users.id, { onDelete: "restrict" }),
    assignedToUserId: uuid("assignedToUserId")
      .references(() => users.id, { onDelete: "set null" }),
    title: varchar("title", { length: 256 }).notNull(),
    description: text("description"),
    status: maintenanceStatusEnum("status").notNull().default("open"),
    priority: priorityEnum("priority").notNull().default("medium"),
    scheduledAt: timestamp("scheduledAt", { withTimezone: true }),
    resolvedAt: timestamp("resolvedAt", { withTimezone: true }),
    costAmount: numeric("costAmount", { precision: 12, scale: 2 }).default("0"),
    metadata: jsonb("metadata").$type<Record<string, unknown>>().default({}),
    createdAt: timestamp("createdAt", { withTimezone: true }).notNull().defaultNow(),
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
    createdAt: timestamp("createdAt", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("maintenanceComments_maintenanceRequestId_index").on(
      t.maintenanceRequestId
    ),
  ]
);

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
    createdAt: timestamp("createdAt", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("maintenanceAttachments_maintenanceRequestId_index").on(
      t.maintenanceRequestId
    ),
  ]
);

// ---------- Activity Log ----------
export const activityLogs = pgTable(
  "activityLogs",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    organizationId: uuid("organizationId")
      .references(() => organizations.id, { onDelete: "set null" }),
    actorUserId: uuid("actorUserId")
      .references(() => users.id, { onDelete: "set null" }),
    action: activityActionEnum("action").notNull(),
    targetTable: varchar("targetTable", { length: 128 }).notNull(),
    targetId: varchar("targetId", { length: 64 }).notNull(), // store UUID string or composite identifier
    description: varchar("description", { length: 512 }),
    changes: jsonb("changes").$type<Record<string, unknown>>(), // before/after diff
    ipAddress: varchar("ipAddress", { length: 64 }),
    userAgent: varchar("userAgent", { length: 256 }),
    createdAt: timestamp("createdAt", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("activityLogs_organizationId_index").on(t.organizationId),
    index("activityLogs_actorUserId_index").on(t.actorUserId),
    index("activityLogs_target_index").on(t.targetTable, t.targetId),
    index("activityLogs_action_index").on(t.action),
    index("activityLogs_createdAt_index").on(t.createdAt),
  ]
);

// ---------- Relations (Drizzle) ----------
export const usersRelations = relations(users, ({ many }) => ({
  userAuth: many(userAuth),
  refreshTokens: many(refreshTokens),
  userOrganizations: many(userOrganizations),
  propertyManagers: many(propertyManagers),
  maintenanceRequestsCreated: many(maintenanceRequests, { relationName: "createdBy" }),
  maintenanceRequestsAssigned: many(maintenanceRequests, { relationName: "assignedTo" }),
  maintenanceComments: many(maintenanceComments),
  paymentsReceivedFrom: many(payments, { relationName: "receivedFrom" }),
  paymentsReceivedBy: many(payments, { relationName: "receivedBy" }),
}));

export const userAuthRelations = relations(userAuth, ({ one }) => ({
  user: one(users, { fields: [userAuth.userId], references: [users.id] }),
}));

export const refreshTokensRelations = relations(refreshTokens, ({ one }) => ({
  user: one(users, { fields: [refreshTokens.userId], references: [users.id] }),
}));


export const organizationsRelations = relations(organizations, ({ many }) => ({
  userOrganizations: many(userOrganizations),
  properties: many(properties),
  amenities: many(amenities),
  leases: many(leases),
  invoices: many(invoices),
  payments: many(payments),
  receipts: many(receipts),
  activityLogs: many(activityLogs),
}));

export const userOrganizationsRelations = relations(userOrganizations, ({ one }) => ({
  user: one(users, { fields: [userOrganizations.userId], references: [users.id] }),
  organization: one(organizations, {
    fields: [userOrganizations.organizationId],
    references: [organizations.id],
  }),
}));

export const propertiesRelations = relations(properties, ({ one, many }) => ({
  organization: one(organizations, {
    fields: [properties.organizationId],
    references: [organizations.id],
  }),
  units: many(units),
  propertyManagers: many(propertyManagers),
  maintenanceRequests: many(maintenanceRequests),
  leases: many(leases),
}));

export const propertyManagersRelations = relations(propertyManagers, ({ one }) => ({
  property: one(properties, { fields: [propertyManagers.propertyId], references: [properties.id] }),
  user: one(users, { fields: [propertyManagers.userId], references: [users.id] }),
}));

export const unitsRelations = relations(units, ({ one, many }) => ({
  property: one(properties, { fields: [units.propertyId], references: [properties.id] }),
  unitAmenities: many(unitAmenities),
  leases: many(leases),
  maintenanceRequests: many(maintenanceRequests),
}));

export const amenitiesRelations = relations(amenities, ({ one, many }) => ({
  organization: one(organizations, {
    fields: [amenities.organizationId],
    references: [organizations.id],
  }),
  unitAmenities: many(unitAmenities),
}));

export const unitAmenitiesRelations = relations(unitAmenities, ({ one }) => ({
  unit: one(units, { fields: [unitAmenities.unitId], references: [units.id] }),
  amenity: one(amenities, { fields: [unitAmenities.amenityId], references: [amenities.id] }),
}));

export const leasesRelations = relations(leases, ({ one, many }) => ({
  organization: one(organizations, { fields: [leases.organizationId], references: [organizations.id] }),
  property: one(properties, { fields: [leases.propertyId], references: [properties.id] }),
  unit: one(units, { fields: [leases.unitId], references: [units.id] }),
  tenant: one(users, { fields: [leases.tenantUserId], references: [users.id] }),
  invoices: many(invoices),
  payments: many(payments),
}));

export const invoicesRelations = relations(invoices, ({ one, many }) => ({
  organization: one(organizations, { fields: [invoices.organizationId], references: [organizations.id] }),
  lease: one(leases, { fields: [invoices.leaseId], references: [leases.id] }),
  items: many(invoiceItems),
  allocations: many(paymentAllocations),
}));

export const invoiceItemsRelations = relations(invoiceItems, ({ one }) => ({
  invoice: one(invoices, { fields: [invoiceItems.invoiceId], references: [invoices.id] }),
}));

export const paymentsRelations = relations(payments, ({ one, many }) => ({
  organization: one(organizations, {
    fields: [payments.organizationId],
    references: [organizations.id],
  }),
  lease: one(leases, {
    fields: [payments.leaseId],
    references: [leases.id],
  }),
  receivedFrom: one(users, {
    fields: [payments.receivedFromUserId],
    references: [users.id],
    relationName: "receivedFrom",
  }),
  receivedBy: one(users, {
    fields: [payments.receivedByUserId],
    references: [users.id],
    relationName: "receivedBy",
  }),
  allocations: many(paymentAllocations),
  receipt: many(receipts),
}));


export const paymentAllocationsRelations = relations(paymentAllocations, ({ one }) => ({
  payment: one(payments, {
    fields: [paymentAllocations.paymentId],
    references: [payments.id],
  }),
  invoice: one(invoices, {
    fields: [paymentAllocations.invoiceId],
    references: [invoices.id],
  }),
}));

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

export const maintenanceRequestsRelations = relations(maintenanceRequests, ({ one, many }) => ({
  organization: one(organizations, { fields: [maintenanceRequests.organizationId], references: [organizations.id] }),
  property: one(properties, { fields: [maintenanceRequests.propertyId], references: [properties.id] }),
  unit: one(units, { fields: [maintenanceRequests.unitId], references: [units.id] }),
  createdBy: one(users, { fields: [maintenanceRequests.createdByUserId], references: [users.id], relationName: "createdBy" }),
  assignedTo: one(users, { fields: [maintenanceRequests.assignedToUserId], references: [users.id], relationName: "assignedTo" }),
  comments: many(maintenanceComments),
  attachments: many(maintenanceAttachments),
}));

export const maintenanceCommentsRelations = relations(maintenanceComments, ({ one }) => ({
  maintenanceRequest: one(maintenanceRequests, {
    fields: [maintenanceComments.maintenanceRequestId],
    references: [maintenanceRequests.id],
  }),
  author: one(users, {
    fields: [maintenanceComments.authorUserId],
    references: [users.id],
  }),
}));

export const maintenanceAttachmentsRelations = relations(maintenanceAttachments, ({ one }) => ({
  maintenanceRequest: one(maintenanceRequests, {
    fields: [maintenanceAttachments.maintenanceRequestId],
    references: [maintenanceRequests.id],
  }),
}));

export const activityLogsRelations = relations(activityLogs, ({ one }) => ({
  organization: one(organizations, {
    fields: [activityLogs.organizationId],
    references: [organizations.id],
  }),
  actor: one(users, {
    fields: [activityLogs.actorUserId],
    references: [users.id],
  }),
}));

export const invitesRelations = relations(invites, ({ one }) => ({
  organization: one(organizations, {
    fields: [invites.organizationId],
    references: [organizations.id],
  }),
  invitedBy: one(users, {
    fields: [invites.invitedByUserId],
    references: [users.id],
  }),
}));

// ---------- Inferred Types ----------
export type UserAuth = typeof userAuth.$inferSelect;
export type NewUserAuth = typeof userAuth.$inferInsert;

export type RefreshToken = typeof refreshTokens.$inferSelect;
export type NewRefreshToken = typeof refreshTokens.$inferInsert;

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;

export type Organization = typeof organizations.$inferSelect;
export type NewOrganization = typeof organizations.$inferInsert;

export type UserOrganization = typeof userOrganizations.$inferSelect;
export type NewUserOrganization = typeof userOrganizations.$inferInsert;

export type Property = typeof properties.$inferSelect;
export type NewProperty = typeof properties.$inferInsert;

export type PropertyManager = typeof propertyManagers.$inferSelect;
export type NewPropertyManager = typeof propertyManagers.$inferInsert;

export type Unit = typeof units.$inferSelect;
export type NewUnit = typeof units.$inferInsert;

export type Amenity = typeof amenities.$inferSelect;
export type NewAmenity = typeof amenities.$inferInsert;

export type UnitAmenity = typeof unitAmenities.$inferSelect;
export type NewUnitAmenity = typeof unitAmenities.$inferInsert;

export type Lease = typeof leases.$inferSelect;
export type NewLease = typeof leases.$inferInsert;

export type Invoice = typeof invoices.$inferSelect;
export type NewInvoice = typeof invoices.$inferInsert;

export type InvoiceItem = typeof invoiceItems.$inferSelect;
export type NewInvoiceItem = typeof invoiceItems.$inferInsert;

export type Payment = typeof payments.$inferSelect;
export type NewPayment = typeof payments.$inferInsert;

export type PaymentAllocation = typeof paymentAllocations.$inferSelect;
export type NewPaymentAllocation = typeof paymentAllocations.$inferInsert;

export type Receipt = typeof receipts.$inferSelect;
export type NewReceipt = typeof receipts.$inferInsert;

export type MaintenanceRequest = typeof maintenanceRequests.$inferSelect;
export type NewMaintenanceRequest = typeof maintenanceRequests.$inferInsert;

export type MaintenanceComment = typeof maintenanceComments.$inferSelect;
export type NewMaintenanceComment = typeof maintenanceComments.$inferInsert;

export type MaintenanceAttachment = typeof maintenanceAttachments.$inferSelect;
export type NewMaintenanceAttachment = typeof maintenanceAttachments.$inferInsert;

export type ActivityLog = typeof activityLogs.$inferSelect;
export type NewActivityLog = typeof activityLogs.$inferInsert;

export type Invite = typeof invites.$inferSelect;
export type NewInvite = typeof invites.$inferInsert;

export type UserRoleEnum = (typeof userRoleEnum.enumValues)[number];
export type ActivityActionEnum = (typeof activityActionEnum.enumValues)[number];
export type UnitStatusEnum = (typeof unitStatusEnum.enumValues)[number];
export type LeaseStatusEnum = (typeof leaseStatusEnum.enumValues)[number];
export type InvoiceStatusEnum = (typeof invoiceStatusEnum.enumValues)[number];
export type PaymentMethodEnum = (typeof paymentMethodEnum.enumValues)[number];
export type PaymentStatusEnum = (typeof paymentStatusEnum.enumValues)[number];
export type MaintenanceStatusEnum = (typeof maintenanceStatusEnum.enumValues)[number];
export type PriorityEnum = (typeof priorityEnum.enumValues)[number];
