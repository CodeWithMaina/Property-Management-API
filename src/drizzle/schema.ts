import { pgTable, uuid, varchar, timestamp, text, integer, decimal, boolean, pgEnum, index, primaryKey } from "drizzle-orm/pg-core";
import { relations, InferModel } from "drizzle-orm";

// =============================
// ENUMS
// =============================
export const userRoleEnum = pgEnum("user_role", [
  "tenant", "property_owner", "manager", "caretaker", "admin", "super_admin"
]);

export const ticketStatusEnum = pgEnum("ticket_status", [
  "open", "in_progress", "resolved", "closed"
]);

export const paymentStatusEnum = pgEnum("payment_status", [
  "pending", "completed", "failed", "refunded"
]);

export const billingIntervalEnum = pgEnum("billing_interval", [
  "monthly", "quarterly", "yearly"
]);

// =============================
// USERS
// =============================
export const users = pgTable("users", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: varchar("name", { length: 100 }).notNull(),
  email: varchar("email", { length: 150 }).notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  role: userRoleEnum("role").notNull().default("tenant"),
  phone: varchar("phone", { length: 20 }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
  deletedAt: timestamp("deleted_at"),
}, (t) => ({
  emailIdx: index("idx_users_email").on(t.email),
}));

// =============================
// PROPERTIES
// =============================
export const properties = pgTable("properties", {
  id: uuid("id").defaultRandom().primaryKey(),
  ownerId: uuid("owner_id").references(() => users.id).notNull(),
  managerId: uuid("manager_id").references(() => users.id),
  name: varchar("name", { length: 150 }).notNull(),
  address: text("address").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
  deletedAt: timestamp("deleted_at"),
}, (t) => ({
  ownerIdx: index("idx_properties_owner").on(t.ownerId),
}));

// =============================
// UNITS
// =============================
export const units = pgTable("units", {
  id: uuid("id").defaultRandom().primaryKey(),
  propertyId: uuid("property_id").references(() => properties.id).notNull(),
  name: varchar("name", { length: 100 }).notNull(),
  type: varchar("type", { length: 50 }), // e.g. Apartment, Studio
  rentAmount: decimal("rent_amount", { precision: 10, scale: 2 }).notNull(),
  isOccupied: boolean("is_occupied").default(false),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
  deletedAt: timestamp("deleted_at"),
}, (t) => ({
  propertyIdx: index("idx_units_property").on(t.propertyId),
}));

// =============================
// AMENITIES
// =============================
export const amenities = pgTable("amenities", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: varchar("name", { length: 100 }).notNull().unique(),
  description: text("description"),
  icon: varchar("icon", { length: 50 }),
  isPropertyAmenity: boolean("is_property_amenity").default(false),
  isUnitAmenity: boolean("is_unit_amenity").default(false),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Property Amenities (Many-to-Many)
export const propertyAmenities = pgTable("property_amenities", {
  propertyId: uuid("property_id").references(() => properties.id).notNull(),
  amenityId: uuid("amenity_id").references(() => amenities.id).notNull(),
}, (t) => ({
  pk: primaryKey(t.propertyId, t.amenityId),
}));

// Unit Amenities (Many-to-Many)
export const unitAmenities = pgTable("unit_amenities", {
  unitId: uuid("unit_id").references(() => units.id).notNull(),
  amenityId: uuid("amenity_id").references(() => amenities.id).notNull(),
}, (t) => ({
  pk: primaryKey(t.unitId, t.amenityId),
}));

// =============================
// LEASES
// =============================
export const leases = pgTable("leases", {
  id: uuid("id").defaultRandom().primaryKey(),
  tenantId: uuid("tenant_id").references(() => users.id).notNull(),
  unitId: uuid("unit_id").references(() => units.id).notNull(),
  startDate: timestamp("start_date").notNull(),
  endDate: timestamp("end_date").notNull(),
  rentAmount: decimal("rent_amount", { precision: 10, scale: 2 }).notNull(),
  depositAmount: decimal("deposit_amount", { precision: 10, scale: 2 }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
  deletedAt: timestamp("deleted_at"),
}, (t) => ({
  tenantIdx: index("idx_leases_tenant").on(t.tenantId),
}));

// =============================
// PAYMENTS
// =============================
export const payments = pgTable("payments", {
  id: uuid("id").defaultRandom().primaryKey(),
  leaseId: uuid("lease_id").references(() => leases.id).notNull(),
  amount: decimal("amount", { precision: 10, scale: 2 }).notNull(),
  status: paymentStatusEnum("status").notNull().default("pending"),
  method: varchar("method", { length: 50 }), // e.g. M-Pesa, Bank
  paidAt: timestamp("paid_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// =============================
// TICKETS
// =============================
export const tickets = pgTable("tickets", {
  id: uuid("id").defaultRandom().primaryKey(),
  createdById: uuid("created_by_id").references(() => users.id).notNull(),
  propertyId: uuid("property_id").references(() => properties.id),
  unitId: uuid("unit_id").references(() => units.id),
  title: varchar("title", { length: 150 }).notNull(),
  description: text("description"),
  status: ticketStatusEnum("status").default("open").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
  deletedAt: timestamp("deleted_at"),
});

// =============================
// BILLING PLANS
// =============================
export const billingPlans = pgTable("billing_plans", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: varchar("name", { length: 100 }).notNull(),
  price: decimal("price", { precision: 10, scale: 2 }).notNull(),
  interval: billingIntervalEnum("interval").notNull().default("monthly"),
  maxProperties: integer("max_properties").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Subscriptions
export const subscriptions = pgTable("subscriptions", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id").references(() => users.id).notNull(),
  planId: uuid("plan_id").references(() => billingPlans.id).notNull(),
  startDate: timestamp("start_date").notNull(),
  endDate: timestamp("end_date"),
  isActive: boolean("is_active").default(true),
});

// =============================
// ACTIVITY LOGS
// =============================
export const activityLogs = pgTable("activity_logs", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id").references(() => users.id),
  action: varchar("action", { length: 150 }).notNull(),
  details: text("details"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// =============================
// RELATIONS
// =============================
export const usersRelations = relations(users, ({ many }) => ({
  properties: many(properties),
  leases: many(leases),
  activityLogs: many(activityLogs),
}));

export const propertiesRelations = relations(properties, ({ one, many }) => ({
  owner: one(users, { fields: [properties.ownerId], references: [users.id] }),
  manager: one(users, { fields: [properties.managerId], references: [users.id] }),
  units: many(units),
  amenities: many(propertyAmenities),
}));

export const unitsRelations = relations(units, ({ one, many }) => ({
  property: one(properties, { fields: [units.propertyId], references: [properties.id] }),
  leases: many(leases),
  amenities: many(unitAmenities),
}));

export const leasesRelations = relations(leases, ({ one, many }) => ({
  tenant: one(users, { fields: [leases.tenantId], references: [users.id] }),
  unit: one(units, { fields: [leases.unitId], references: [units.id] }),
  payments: many(payments),
}));

export const amenitiesRelations = relations(amenities, ({ many }) => ({
  properties: many(propertyAmenities),
  units: many(unitAmenities),
}));

export const propertyAmenitiesRelations = relations(propertyAmenities, ({ one }) => ({
  property: one(properties, { fields: [propertyAmenities.propertyId], references: [properties.id] }),
  amenity: one(amenities, { fields: [propertyAmenities.amenityId], references: [amenities.id] }),
}));

export const unitAmenitiesRelations = relations(unitAmenities, ({ one }) => ({
  unit: one(units, { fields: [unitAmenities.unitId], references: [units.id] }),
  amenity: one(amenities, { fields: [unitAmenities.amenityId], references: [amenities.id] }),
}));

// =============================
// INFERRED TYPES
// =============================
export type User = InferModel<typeof users>;
export type NewUser = InferModel<typeof users, "insert">;

export type Property = InferModel<typeof properties>;
export type NewProperty = InferModel<typeof properties, "insert">;

export type Unit = InferModel<typeof units>;
export type NewUnit = InferModel<typeof units, "insert">;

export type Amenity = InferModel<typeof amenities>;
export type NewAmenity = InferModel<typeof amenities, "insert">;

export type Lease = InferModel<typeof leases>;
export type NewLease = InferModel<typeof leases, "insert">;

export type Payment = InferModel<typeof payments>;
export type NewPayment = InferModel<typeof payments, "insert">;

export type Ticket = InferModel<typeof tickets>;
export type NewTicket = InferModel<typeof tickets, "insert">;

export type BillingPlan = InferModel<typeof billingPlans>;
export type NewBillingPlan = InferModel<typeof billingPlans, "insert">;

export type Subscription = InferModel<typeof subscriptions>;
export type NewSubscription = InferModel<typeof subscriptions, "insert">;

export type ActivityLog = InferModel<typeof activityLogs>;
export type NewActivityLog = InferModel<typeof activityLogs, "insert">;

export type PropertyAmenity = InferModel<typeof propertyAmenities>;
export type NewPropertyAmenity = InferModel<typeof propertyAmenities, "insert">;

export type UnitAmenity = InferModel<typeof unitAmenities>;
export type NewUnitAmenity = InferModel<typeof unitAmenities, "insert">;