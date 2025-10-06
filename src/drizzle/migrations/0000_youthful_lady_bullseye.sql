CREATE TYPE "public"."activityActionEnum" AS ENUM('create', 'update', 'delete', 'statusChange', 'assign', 'unassign', 'comment', 'payment', 'issueInvoice', 'voidInvoice', 'login', 'logout', 'permissionChange');--> statement-breakpoint
CREATE TYPE "public"."invoiceStatusEnum" AS ENUM('draft', 'issued', 'partiallyPaid', 'paid', 'void', 'overdue');--> statement-breakpoint
CREATE TYPE "public"."leaseStatusEnum" AS ENUM('draft', 'active', 'pendingMoveIn', 'ended', 'terminated', 'cancelled');--> statement-breakpoint
CREATE TYPE "public"."maintenanceStatusEnum" AS ENUM('open', 'inProgress', 'onHold', 'resolved', 'closed', 'cancelled');--> statement-breakpoint
CREATE TYPE "public"."paymentMethodEnum" AS ENUM('cash', 'mpesa', 'bankTransfer', 'card', 'cheque', 'other');--> statement-breakpoint
CREATE TYPE "public"."paymentStatusEnum" AS ENUM('pending', 'completed', 'failed', 'refunded', 'cancelled');--> statement-breakpoint
CREATE TYPE "public"."priorityEnum" AS ENUM('low', 'medium', 'high', 'urgent');--> statement-breakpoint
CREATE TYPE "public"."unitStatusEnum" AS ENUM('vacant', 'reserved', 'occupied', 'unavailable');--> statement-breakpoint
CREATE TYPE "public"."userRoleEnum" AS ENUM('tenant', 'caretaker', 'manager', 'propertyOwner', 'admin', 'superAdmin');--> statement-breakpoint
CREATE TABLE "activityLogs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organizationId" uuid,
	"actorUserId" uuid,
	"action" "activityActionEnum" NOT NULL,
	"targetTable" varchar(128) NOT NULL,
	"targetId" varchar(64) NOT NULL,
	"description" varchar(512),
	"changes" jsonb,
	"ipAddress" varchar(64),
	"userAgent" varchar(256),
	"createdAt" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "amenities" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organizationId" uuid NOT NULL,
	"name" varchar(128) NOT NULL,
	"description" text,
	"createdAt" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "invites" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" varchar(320) NOT NULL,
	"organizationId" uuid NOT NULL,
	"role" "userRoleEnum" NOT NULL,
	"permissions" jsonb DEFAULT '{}'::jsonb,
	"invitedByUserId" uuid,
	"token" varchar(255) NOT NULL,
	"expiresAt" timestamp with time zone NOT NULL,
	"isUsed" boolean DEFAULT false NOT NULL,
	"usedAt" timestamp with time zone,
	"createdAt" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "invoiceItems" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"invoiceId" uuid NOT NULL,
	"description" varchar(256) NOT NULL,
	"quantity" numeric(12, 2) DEFAULT '1' NOT NULL,
	"unitPrice" numeric(12, 2) DEFAULT '0' NOT NULL,
	"lineTotal" numeric(12, 2) DEFAULT '0' NOT NULL,
	"metadata" jsonb DEFAULT '{}'::jsonb
);
--> statement-breakpoint
CREATE TABLE "invoices" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organizationId" uuid NOT NULL,
	"leaseId" uuid NOT NULL,
	"invoiceNumber" varchar(64) NOT NULL,
	"status" "invoiceStatusEnum" DEFAULT 'issued' NOT NULL,
	"issueDate" timestamp with time zone DEFAULT now() NOT NULL,
	"dueDate" timestamp with time zone NOT NULL,
	"currency" varchar(3) DEFAULT 'KES' NOT NULL,
	"subtotalAmount" numeric(12, 2) DEFAULT '0' NOT NULL,
	"taxAmount" numeric(12, 2) DEFAULT '0' NOT NULL,
	"totalAmount" numeric(12, 2) DEFAULT '0' NOT NULL,
	"balanceAmount" numeric(12, 2) DEFAULT '0' NOT NULL,
	"notes" text,
	"metadata" jsonb DEFAULT '{}'::jsonb,
	"createdAt" timestamp with time zone DEFAULT now() NOT NULL,
	"updatedAt" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "leases" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organizationId" uuid NOT NULL,
	"propertyId" uuid NOT NULL,
	"unitId" uuid NOT NULL,
	"tenantUserId" uuid NOT NULL,
	"status" "leaseStatusEnum" DEFAULT 'draft' NOT NULL,
	"startDate" timestamp with time zone NOT NULL,
	"endDate" timestamp with time zone,
	"rentAmount" numeric(12, 2) NOT NULL,
	"depositAmount" numeric(12, 2) DEFAULT '0' NOT NULL,
	"dueDayOfMonth" integer DEFAULT 1 NOT NULL,
	"billingCurrency" varchar(3) DEFAULT 'KES' NOT NULL,
	"lateFeePercent" numeric(5, 2) DEFAULT '0',
	"notes" text,
	"metadata" jsonb DEFAULT '{}'::jsonb,
	"createdAt" timestamp with time zone DEFAULT now() NOT NULL,
	"updatedAt" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "maintenanceAttachments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"maintenanceRequestId" uuid NOT NULL,
	"fileUrl" varchar(1024) NOT NULL,
	"fileName" varchar(256),
	"contentType" varchar(128),
	"sizeBytes" integer,
	"createdAt" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "maintenanceComments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"maintenanceRequestId" uuid NOT NULL,
	"authorUserId" uuid NOT NULL,
	"body" text NOT NULL,
	"createdAt" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "maintenanceRequests" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organizationId" uuid NOT NULL,
	"propertyId" uuid NOT NULL,
	"unitId" uuid,
	"createdByUserId" uuid NOT NULL,
	"assignedToUserId" uuid,
	"title" varchar(256) NOT NULL,
	"description" text,
	"status" "maintenanceStatusEnum" DEFAULT 'open' NOT NULL,
	"priority" "priorityEnum" DEFAULT 'medium' NOT NULL,
	"scheduledAt" timestamp with time zone,
	"resolvedAt" timestamp with time zone,
	"costAmount" numeric(12, 2) DEFAULT '0',
	"metadata" jsonb DEFAULT '{}'::jsonb,
	"createdAt" timestamp with time zone DEFAULT now() NOT NULL,
	"updatedAt" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "mfaBackupCodes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"userId" uuid NOT NULL,
	"code" varchar(16) NOT NULL,
	"isUsed" boolean DEFAULT false NOT NULL,
	"usedAt" timestamp with time zone,
	"createdAt" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "organizationSettings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organizationId" uuid NOT NULL,
	"managerCanCreateProperties" boolean DEFAULT true NOT NULL,
	"managerCanDeleteProperties" boolean DEFAULT false NOT NULL,
	"managerCanInviteUsers" boolean DEFAULT true NOT NULL,
	"managerMaxProperties" integer,
	"mfaRequired" boolean DEFAULT false,
	"defaultCurrency" varchar(3) DEFAULT 'KES',
	"timezone" varchar(64) DEFAULT 'Africa/Nairobi',
	"invoiceDueDays" integer DEFAULT 30,
	"lateFeeEnabled" boolean DEFAULT true,
	"lateFeePercent" numeric(5, 2) DEFAULT '5.00',
	"createdAt" timestamp with time zone DEFAULT now() NOT NULL,
	"updatedAt" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "organizations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(256) NOT NULL,
	"legalName" varchar(256),
	"taxId" varchar(64),
	"isActive" boolean DEFAULT true NOT NULL,
	"metadata" jsonb DEFAULT '{}'::jsonb,
	"createdAt" timestamp with time zone DEFAULT now() NOT NULL,
	"updatedAt" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "paymentAllocations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"paymentId" uuid NOT NULL,
	"invoiceId" uuid NOT NULL,
	"amountApplied" numeric(12, 2) NOT NULL,
	"createdAt" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "payments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organizationId" uuid NOT NULL,
	"leaseId" uuid,
	"receivedFromUserId" uuid,
	"receivedByUserId" uuid,
	"method" "paymentMethodEnum" DEFAULT 'cash' NOT NULL,
	"status" "paymentStatusEnum" DEFAULT 'completed' NOT NULL,
	"amount" numeric(12, 2) NOT NULL,
	"currency" varchar(3) DEFAULT 'KES' NOT NULL,
	"referenceCode" varchar(128),
	"narrative" varchar(512),
	"receivedAt" timestamp with time zone DEFAULT now() NOT NULL,
	"metadata" jsonb DEFAULT '{}'::jsonb,
	"createdAt" timestamp with time zone DEFAULT now() NOT NULL,
	"updatedAt" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "permissionTemplates" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(128) NOT NULL,
	"description" text,
	"permissions" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"isSystem" boolean DEFAULT false NOT NULL,
	"organizationId" uuid,
	"createdAt" timestamp with time zone DEFAULT now() NOT NULL,
	"updatedAt" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "properties" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organizationId" uuid NOT NULL,
	"name" varchar(256) NOT NULL,
	"description" text,
	"addressLine1" varchar(256),
	"addressLine2" varchar(256),
	"city" varchar(128),
	"state" varchar(128),
	"postalCode" varchar(32),
	"country" varchar(128),
	"timezone" varchar(64),
	"isActive" boolean DEFAULT true NOT NULL,
	"createdByUserId" uuid,
	"metadata" jsonb DEFAULT '{}'::jsonb,
	"createdAt" timestamp with time zone DEFAULT now() NOT NULL,
	"updatedAt" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "propertyManagers" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"propertyId" uuid NOT NULL,
	"userId" uuid NOT NULL,
	"role" "userRoleEnum" DEFAULT 'manager' NOT NULL,
	"permissions" jsonb DEFAULT '{}'::jsonb,
	"createdAt" timestamp with time zone DEFAULT now() NOT NULL,
	"updatedAt" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "receipts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organizationId" uuid NOT NULL,
	"paymentId" uuid NOT NULL,
	"receiptNumber" varchar(64) NOT NULL,
	"issuedAt" timestamp with time zone DEFAULT now() NOT NULL,
	"createdAt" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "refreshTokens" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"userId" uuid NOT NULL,
	"token" varchar(512) NOT NULL,
	"deviceId" varchar(255),
	"userAgent" varchar(512),
	"ipAddress" varchar(45),
	"expiresAt" timestamp with time zone NOT NULL,
	"isRevoked" boolean DEFAULT false NOT NULL,
	"revokedAt" timestamp with time zone,
	"createdAt" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "unitAmenities" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"unitId" uuid NOT NULL,
	"amenityId" uuid NOT NULL,
	"createdAt" timestamp with time zone DEFAULT now() NOT NULL,
	"metadata" jsonb DEFAULT '{}'::jsonb
);
--> statement-breakpoint
CREATE TABLE "units" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"propertyId" uuid NOT NULL,
	"code" varchar(64) NOT NULL,
	"floor" integer,
	"bedrooms" integer DEFAULT 0 NOT NULL,
	"bathrooms" integer DEFAULT 0 NOT NULL,
	"sizeSqm" numeric(10, 2),
	"baseRent" numeric(12, 2) DEFAULT '0' NOT NULL,
	"status" "unitStatusEnum" DEFAULT 'vacant' NOT NULL,
	"isActive" boolean DEFAULT true NOT NULL,
	"metadata" jsonb DEFAULT '{}'::jsonb,
	"createdAt" timestamp with time zone DEFAULT now() NOT NULL,
	"updatedAt" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "userAuth" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"userId" uuid NOT NULL,
	"email" varchar(320) NOT NULL,
	"passwordHash" varchar(255) NOT NULL,
	"isEmailVerified" boolean DEFAULT false NOT NULL,
	"lastLoginAt" timestamp with time zone,
	"verificationToken" varchar(255),
	"resetToken" varchar(255),
	"resetTokenExpiresAt" timestamp with time zone,
	"mfaSecret" varchar(255),
	"mfaEnabled" boolean DEFAULT false NOT NULL,
	"createdAt" timestamp with time zone DEFAULT now() NOT NULL,
	"updatedAt" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "userOrganizations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"userId" uuid NOT NULL,
	"organizationId" uuid NOT NULL,
	"role" "userRoleEnum" DEFAULT 'tenant' NOT NULL,
	"isPrimary" boolean DEFAULT false NOT NULL,
	"permissions" jsonb DEFAULT '{}'::jsonb,
	"createdAt" timestamp with time zone DEFAULT now() NOT NULL,
	"updatedAt" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"fullName" varchar(256) NOT NULL,
	"email" varchar(320) NOT NULL,
	"phone" varchar(64),
	"isActive" boolean DEFAULT true NOT NULL,
	"avatarUrl" varchar(1024),
	"metadata" jsonb DEFAULT '{}'::jsonb,
	"createdAt" timestamp with time zone DEFAULT now() NOT NULL,
	"updatedAt" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "activityLogs" ADD CONSTRAINT "activityLogs_organizationId_organizations_id_fk" FOREIGN KEY ("organizationId") REFERENCES "public"."organizations"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "activityLogs" ADD CONSTRAINT "activityLogs_actorUserId_users_id_fk" FOREIGN KEY ("actorUserId") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "amenities" ADD CONSTRAINT "amenities_organizationId_organizations_id_fk" FOREIGN KEY ("organizationId") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "invites" ADD CONSTRAINT "invites_organizationId_organizations_id_fk" FOREIGN KEY ("organizationId") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "invites" ADD CONSTRAINT "invites_invitedByUserId_users_id_fk" FOREIGN KEY ("invitedByUserId") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "invoiceItems" ADD CONSTRAINT "invoiceItems_invoiceId_invoices_id_fk" FOREIGN KEY ("invoiceId") REFERENCES "public"."invoices"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_organizationId_organizations_id_fk" FOREIGN KEY ("organizationId") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_leaseId_leases_id_fk" FOREIGN KEY ("leaseId") REFERENCES "public"."leases"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "leases" ADD CONSTRAINT "leases_organizationId_organizations_id_fk" FOREIGN KEY ("organizationId") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "leases" ADD CONSTRAINT "leases_propertyId_properties_id_fk" FOREIGN KEY ("propertyId") REFERENCES "public"."properties"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "leases" ADD CONSTRAINT "leases_unitId_units_id_fk" FOREIGN KEY ("unitId") REFERENCES "public"."units"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "leases" ADD CONSTRAINT "leases_tenantUserId_users_id_fk" FOREIGN KEY ("tenantUserId") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "maintenanceAttachments" ADD CONSTRAINT "maintenanceAttachments_maintenanceRequestId_maintenanceRequests_id_fk" FOREIGN KEY ("maintenanceRequestId") REFERENCES "public"."maintenanceRequests"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "maintenanceComments" ADD CONSTRAINT "maintenanceComments_maintenanceRequestId_maintenanceRequests_id_fk" FOREIGN KEY ("maintenanceRequestId") REFERENCES "public"."maintenanceRequests"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "maintenanceComments" ADD CONSTRAINT "maintenanceComments_authorUserId_users_id_fk" FOREIGN KEY ("authorUserId") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "maintenanceRequests" ADD CONSTRAINT "maintenanceRequests_organizationId_organizations_id_fk" FOREIGN KEY ("organizationId") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "maintenanceRequests" ADD CONSTRAINT "maintenanceRequests_propertyId_properties_id_fk" FOREIGN KEY ("propertyId") REFERENCES "public"."properties"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "maintenanceRequests" ADD CONSTRAINT "maintenanceRequests_unitId_units_id_fk" FOREIGN KEY ("unitId") REFERENCES "public"."units"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "maintenanceRequests" ADD CONSTRAINT "maintenanceRequests_createdByUserId_users_id_fk" FOREIGN KEY ("createdByUserId") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "maintenanceRequests" ADD CONSTRAINT "maintenanceRequests_assignedToUserId_users_id_fk" FOREIGN KEY ("assignedToUserId") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "mfaBackupCodes" ADD CONSTRAINT "mfaBackupCodes_userId_users_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "organizationSettings" ADD CONSTRAINT "organizationSettings_organizationId_organizations_id_fk" FOREIGN KEY ("organizationId") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "paymentAllocations" ADD CONSTRAINT "paymentAllocations_paymentId_payments_id_fk" FOREIGN KEY ("paymentId") REFERENCES "public"."payments"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "paymentAllocations" ADD CONSTRAINT "paymentAllocations_invoiceId_invoices_id_fk" FOREIGN KEY ("invoiceId") REFERENCES "public"."invoices"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payments" ADD CONSTRAINT "payments_organizationId_organizations_id_fk" FOREIGN KEY ("organizationId") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payments" ADD CONSTRAINT "payments_leaseId_leases_id_fk" FOREIGN KEY ("leaseId") REFERENCES "public"."leases"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payments" ADD CONSTRAINT "payments_receivedFromUserId_users_id_fk" FOREIGN KEY ("receivedFromUserId") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payments" ADD CONSTRAINT "payments_receivedByUserId_users_id_fk" FOREIGN KEY ("receivedByUserId") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "permissionTemplates" ADD CONSTRAINT "permissionTemplates_organizationId_organizations_id_fk" FOREIGN KEY ("organizationId") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "properties" ADD CONSTRAINT "properties_organizationId_organizations_id_fk" FOREIGN KEY ("organizationId") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "properties" ADD CONSTRAINT "properties_createdByUserId_users_id_fk" FOREIGN KEY ("createdByUserId") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "propertyManagers" ADD CONSTRAINT "propertyManagers_propertyId_properties_id_fk" FOREIGN KEY ("propertyId") REFERENCES "public"."properties"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "propertyManagers" ADD CONSTRAINT "propertyManagers_userId_users_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "receipts" ADD CONSTRAINT "receipts_organizationId_organizations_id_fk" FOREIGN KEY ("organizationId") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "receipts" ADD CONSTRAINT "receipts_paymentId_payments_id_fk" FOREIGN KEY ("paymentId") REFERENCES "public"."payments"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "refreshTokens" ADD CONSTRAINT "refreshTokens_userId_users_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "unitAmenities" ADD CONSTRAINT "unitAmenities_unitId_units_id_fk" FOREIGN KEY ("unitId") REFERENCES "public"."units"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "unitAmenities" ADD CONSTRAINT "unitAmenities_amenityId_amenities_id_fk" FOREIGN KEY ("amenityId") REFERENCES "public"."amenities"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "units" ADD CONSTRAINT "units_propertyId_properties_id_fk" FOREIGN KEY ("propertyId") REFERENCES "public"."properties"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "userAuth" ADD CONSTRAINT "userAuth_userId_users_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "userOrganizations" ADD CONSTRAINT "userOrganizations_userId_users_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "userOrganizations" ADD CONSTRAINT "userOrganizations_organizationId_organizations_id_fk" FOREIGN KEY ("organizationId") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "activityLogs_organizationId_index" ON "activityLogs" USING btree ("organizationId");--> statement-breakpoint
CREATE INDEX "activityLogs_actorUserId_index" ON "activityLogs" USING btree ("actorUserId");--> statement-breakpoint
CREATE INDEX "activityLogs_target_index" ON "activityLogs" USING btree ("targetTable","targetId");--> statement-breakpoint
CREATE INDEX "activityLogs_action_index" ON "activityLogs" USING btree ("action");--> statement-breakpoint
CREATE INDEX "activityLogs_createdAt_index" ON "activityLogs" USING btree ("createdAt");--> statement-breakpoint
CREATE UNIQUE INDEX "amenities_organizationId_name_unique" ON "amenities" USING btree ("organizationId","name");--> statement-breakpoint
CREATE UNIQUE INDEX "invites_token_unique" ON "invites" USING btree ("token");--> statement-breakpoint
CREATE INDEX "invites_email_index" ON "invites" USING btree ("email");--> statement-breakpoint
CREATE INDEX "invites_organizationId_index" ON "invites" USING btree ("organizationId");--> statement-breakpoint
CREATE INDEX "invites_expiresAt_index" ON "invites" USING btree ("expiresAt");--> statement-breakpoint
CREATE INDEX "invites_isUsed_index" ON "invites" USING btree ("isUsed");--> statement-breakpoint
CREATE INDEX "invoiceItems_invoiceId_index" ON "invoiceItems" USING btree ("invoiceId");--> statement-breakpoint
CREATE UNIQUE INDEX "invoices_organizationId_invoiceNumber_unique" ON "invoices" USING btree ("organizationId","invoiceNumber");--> statement-breakpoint
CREATE INDEX "invoices_leaseId_index" ON "invoices" USING btree ("leaseId");--> statement-breakpoint
CREATE INDEX "invoices_status_index" ON "invoices" USING btree ("status");--> statement-breakpoint
CREATE INDEX "invoices_dueDate_index" ON "invoices" USING btree ("dueDate");--> statement-breakpoint
CREATE INDEX "leases_unitId_active_index" ON "leases" USING btree ("unitId","status");--> statement-breakpoint
CREATE INDEX "leases_organizationId_index" ON "leases" USING btree ("organizationId");--> statement-breakpoint
CREATE INDEX "leases_tenantUserId_index" ON "leases" USING btree ("tenantUserId");--> statement-breakpoint
CREATE INDEX "maintenanceAttachments_maintenanceRequestId_index" ON "maintenanceAttachments" USING btree ("maintenanceRequestId");--> statement-breakpoint
CREATE INDEX "maintenanceComments_maintenanceRequestId_index" ON "maintenanceComments" USING btree ("maintenanceRequestId");--> statement-breakpoint
CREATE INDEX "maintenanceRequests_organizationId_index" ON "maintenanceRequests" USING btree ("organizationId");--> statement-breakpoint
CREATE INDEX "maintenanceRequests_propertyId_index" ON "maintenanceRequests" USING btree ("propertyId");--> statement-breakpoint
CREATE INDEX "maintenanceRequests_status_index" ON "maintenanceRequests" USING btree ("status");--> statement-breakpoint
CREATE INDEX "maintenanceRequests_assignedToUserId_index" ON "maintenanceRequests" USING btree ("assignedToUserId");--> statement-breakpoint
CREATE INDEX "maintenanceRequests_priority_index" ON "maintenanceRequests" USING btree ("priority");--> statement-breakpoint
CREATE INDEX "mfaBackupCodes_userId_index" ON "mfaBackupCodes" USING btree ("userId");--> statement-breakpoint
CREATE INDEX "mfaBackupCodes_isUsed_index" ON "mfaBackupCodes" USING btree ("isUsed");--> statement-breakpoint
CREATE UNIQUE INDEX "organizationSettings_organizationId_unique" ON "organizationSettings" USING btree ("organizationId");--> statement-breakpoint
CREATE UNIQUE INDEX "organizations_name_unique" ON "organizations" USING btree ("name");--> statement-breakpoint
CREATE UNIQUE INDEX "paymentAllocations_paymentId_invoiceId_unique" ON "paymentAllocations" USING btree ("paymentId","invoiceId");--> statement-breakpoint
CREATE INDEX "paymentAllocations_invoiceId_index" ON "paymentAllocations" USING btree ("invoiceId");--> statement-breakpoint
CREATE INDEX "payments_organizationId_index" ON "payments" USING btree ("organizationId");--> statement-breakpoint
CREATE INDEX "payments_method_index" ON "payments" USING btree ("method");--> statement-breakpoint
CREATE INDEX "payments_status_index" ON "payments" USING btree ("status");--> statement-breakpoint
CREATE INDEX "payments_leaseId_index" ON "payments" USING btree ("leaseId");--> statement-breakpoint
CREATE INDEX "payments_referenceCode_index" ON "payments" USING btree ("referenceCode");--> statement-breakpoint
CREATE UNIQUE INDEX "permissionTemplates_name_organizationId_unique" ON "permissionTemplates" USING btree ("name","organizationId");--> statement-breakpoint
CREATE INDEX "permissionTemplates_organizationId_index" ON "permissionTemplates" USING btree ("organizationId");--> statement-breakpoint
CREATE UNIQUE INDEX "properties_organizationId_name_unique" ON "properties" USING btree ("organizationId","name");--> statement-breakpoint
CREATE INDEX "properties_organizationId_index" ON "properties" USING btree ("organizationId");--> statement-breakpoint
CREATE INDEX "properties_createdByUserId_index" ON "properties" USING btree ("createdByUserId");--> statement-breakpoint
CREATE UNIQUE INDEX "propertyManagers_propertyId_userId_unique" ON "propertyManagers" USING btree ("propertyId","userId");--> statement-breakpoint
CREATE INDEX "propertyManagers_userId_index" ON "propertyManagers" USING btree ("userId");--> statement-breakpoint
CREATE UNIQUE INDEX "receipts_organizationId_receiptNumber_unique" ON "receipts" USING btree ("organizationId","receiptNumber");--> statement-breakpoint
CREATE UNIQUE INDEX "receipts_paymentId_unique" ON "receipts" USING btree ("paymentId");--> statement-breakpoint
CREATE UNIQUE INDEX "refreshTokens_token_unique" ON "refreshTokens" USING btree ("token");--> statement-breakpoint
CREATE INDEX "refreshTokens_userId_index" ON "refreshTokens" USING btree ("userId");--> statement-breakpoint
CREATE INDEX "refreshTokens_deviceId_index" ON "refreshTokens" USING btree ("deviceId");--> statement-breakpoint
CREATE INDEX "refreshTokens_expiresAt_index" ON "refreshTokens" USING btree ("expiresAt");--> statement-breakpoint
CREATE INDEX "refreshTokens_isRevoked_index" ON "refreshTokens" USING btree ("isRevoked");--> statement-breakpoint
CREATE UNIQUE INDEX "unitAmenities_unitId_amenityId_unique" ON "unitAmenities" USING btree ("unitId","amenityId");--> statement-breakpoint
CREATE UNIQUE INDEX "units_propertyId_code_unique" ON "units" USING btree ("propertyId","code");--> statement-breakpoint
CREATE INDEX "units_propertyId_index" ON "units" USING btree ("propertyId");--> statement-breakpoint
CREATE INDEX "units_status_index" ON "units" USING btree ("status");--> statement-breakpoint
CREATE UNIQUE INDEX "userAuth_email_unique" ON "userAuth" USING btree ("email");--> statement-breakpoint
CREATE UNIQUE INDEX "userAuth_userId_unique" ON "userAuth" USING btree ("userId");--> statement-breakpoint
CREATE INDEX "userAuth_verificationToken_index" ON "userAuth" USING btree ("verificationToken");--> statement-breakpoint
CREATE INDEX "userAuth_resetToken_index" ON "userAuth" USING btree ("resetToken");--> statement-breakpoint
CREATE UNIQUE INDEX "userOrganizations_userId_organizationId_unique" ON "userOrganizations" USING btree ("userId","organizationId");--> statement-breakpoint
CREATE INDEX "userOrganizations_role_index" ON "userOrganizations" USING btree ("role");--> statement-breakpoint
CREATE INDEX "userOrganizations_isPrimary_index" ON "userOrganizations" USING btree ("isPrimary");--> statement-breakpoint
CREATE UNIQUE INDEX "users_email_unique" ON "users" USING btree ("email");--> statement-breakpoint
CREATE INDEX "users_phone_index" ON "users" USING btree ("phone");