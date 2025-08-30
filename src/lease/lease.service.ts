// lease.service.ts
import { eq, and, desc, sql, inArray, gte, lte, or, isNull } from "drizzle-orm";
import db from "../drizzle/db";
import { 
  leases, 
  Lease, 
  LeaseStatusEnum,
  units,
  properties,
  organizations,
  users,
  invoices,
  invoiceItems,
  payments,
  paymentAllocations,
  unitStatusEnum,
  invoiceStatusEnum,
  leaseStatusEnum
} from "../drizzle/schema";
import { 
  LeaseInput, 
  PartialLeaseInput, 
  LeaseQueryParams, 
  LeaseStatusChangeInput,
  LeaseRenewalInput
} from "./lease.validator";
import { NotFoundError, ConflictError, ValidationError } from "../utils/errorHandler";

/**
 * Get all leases with optional filtering and pagination
 */
export const getLeasesServices = async (
  queryParams: LeaseQueryParams
): Promise<{ leases: Lease[]; total: number }> => {
  const { organizationId, propertyId, tenantUserId, status, page, limit } = queryParams;
  const offset = (page - 1) * limit;

  // Build where conditions
  const whereConditions = [];
  
  if (organizationId) {
    whereConditions.push(eq(leases.organizationId, organizationId));
  }
  
  if (propertyId) {
    whereConditions.push(eq(leases.propertyId, propertyId));
  }
  
  if (tenantUserId) {
    whereConditions.push(eq(leases.tenantUserId, tenantUserId));
  }
  
  if (status) {
    whereConditions.push(eq(leases.status, status));
  }

  const whereClause = whereConditions.length > 0 
    ? and(...whereConditions) 
    : undefined;

  try {
    // Get leases with related data
    const leasesList = await db.query.leases.findMany({
      where: whereClause,
      with: {
        organization: {
          columns: {
            id: true,
            name: true,
          }
        },
        property: {
          columns: {
            id: true,
            name: true,
          }
        },
        unit: {
          columns: {
            id: true,
            code: true,
          }
        },
        tenant: {
          columns: {
            id: true,
            fullName: true,
            email: true,
          }
        }
      },
      orderBy: [desc(leases.createdAt)],
      limit: limit,
      offset: offset,
    });

    // Get total count for pagination
    const totalResult = await db
      .select({ count: sql<number>`count(*)` })
      .from(leases)
      .where(whereClause || sql`1=1`);

    const total = totalResult[0]?.count || 0;

    return {
      leases: leasesList,
      total,
    };
  } catch (error) {
    console.error('Error in getLeasesServices:', error);
    throw error;
  }
};

/**
 * Get lease by ID with detailed information
 */
export const getLeaseByIdServices = async (
  leaseId: string
): Promise<Lease | undefined> => {
  return await db.query.leases.findFirst({
    where: eq(leases.id, leaseId),
    with: {
      organization: {
        columns: {
          id: true,
          name: true,
          legalName: true,
        }
      },
      property: {
        columns: {
          id: true,
          name: true,
          addressLine1: true,
          addressLine2: true,
          city: true,
          state: true,
        }
      },
      unit: {
        columns: {
          id: true,
          code: true,
          floor: true,
          bedrooms: true,
          bathrooms: true,
          sizeSqm: true,
          baseRent: true,
          status: true,
        }
      },
      tenant: {
        columns: {
          id: true,
          fullName: true,
          email: true,
          phone: true,
          avatarUrl: true,
        }
      },
      invoices: {
        columns: {
          id: true,
          invoiceNumber: true,
          status: true,
          issueDate: true,
          dueDate: true,
          totalAmount: true,
          balanceAmount: true,
        },
        orderBy: [desc(invoices.dueDate)],
      },
    }
  });
};

/**
 * Create a new lease
 */
export const createLeaseServices = async (
  leaseData: LeaseInput
): Promise<Lease> => {
  // Check if organization exists
  const organizationExists = await db.query.organizations.findFirst({
    where: eq(organizations.id, leaseData.organizationId),
    columns: { id: true }
  });

  if (!organizationExists) {
    throw new NotFoundError("Organization");
  }

  // Check if property exists and belongs to organization
  const propertyExists = await db.query.properties.findFirst({
    where: and(
      eq(properties.id, leaseData.propertyId),
      eq(properties.organizationId, leaseData.organizationId)
    ),
    columns: { id: true }
  });

  if (!propertyExists) {
    throw new NotFoundError("Property or property doesn't belong to organization");
  }

  // Check if unit exists and belongs to property
  const unitExists = await db.query.units.findFirst({
    where: and(
      eq(units.id, leaseData.unitId),
      eq(units.propertyId, leaseData.propertyId)
    ),
    columns: { id: true, status: true }
  });

  if (!unitExists) {
    throw new NotFoundError("Unit or unit doesn't belong to property");
  }

  // Check if tenant exists
  const tenantExists = await db.query.users.findFirst({
    where: eq(users.id, leaseData.tenantUserId),
    columns: { id: true }
  });

  if (!tenantExists) {
    throw new NotFoundError("Tenant");
  }

  // Check if unit is available
  if (unitExists.status !== "vacant" && unitExists.status !== "unavailable") {
    throw new ConflictError("Unit is not available for leasing");
  }

  // Check for date conflicts with existing leases
  const conflictingLeases = await db.query.leases.findMany({
    where: and(
      eq(leases.unitId, leaseData.unitId),
      inArray(leases.status, ["active", "pendingMoveIn"]),
      or(
        and(
          gte(leases.startDate, leaseData.startDate),
          lte(leases.startDate, leaseData.endDate)
        ),
        and(
          gte(leases.endDate, leaseData.startDate),
          lte(leases.endDate, leaseData.endDate)
        ),
        and(
          lte(leases.startDate, leaseData.startDate),
          gte(leases.endDate, leaseData.endDate)
        )
      )
    ),
    columns: { id: true }
  });

  if (conflictingLeases.length > 0) {
    throw new ConflictError("Lease dates conflict with existing lease for this unit");
  }

  // Prepare data for insertion
  const insertData = {
    organizationId: leaseData.organizationId,
    propertyId: leaseData.propertyId,
    unitId: leaseData.unitId,
    tenantUserId: leaseData.tenantUserId,
    startDate: leaseData.startDate,
    endDate: leaseData.endDate,
    rentAmount: leaseData.rentAmount.toString(),
    depositAmount: leaseData.depositAmount.toString(),
    dueDayOfMonth: leaseData.dueDayOfMonth,
    billingCurrency: leaseData.billingCurrency,
    lateFeePercent: leaseData.lateFeePercent ? leaseData.lateFeePercent.toString() : "0",
    notes: leaseData.notes || null,
    metadata: leaseData.metadata || {},
  };

  const result = await db.insert(leases)
    .values(insertData)
    .returning();
  
  return result[0];
};

/**
 * Update an existing lease
 */
export const updateLeaseServices = async (
  leaseId: string,
  leaseData: PartialLeaseInput
): Promise<Lease> => {
  // Check if lease exists
  const leaseExists = await db.query.leases.findFirst({
    where: eq(leases.id, leaseId),
    columns: { id: true, status: true, unitId: true, startDate: true, endDate: true }
  });

  if (!leaseExists) {
    throw new NotFoundError("Lease");
  }

  // Don't allow updates to active or terminated leases except for specific fields
  if (["active", "terminated"].includes(leaseExists.status)) {
    const allowedFields = ["notes", "metadata", "lateFeePercent"];
    const disallowedFields = Object.keys(leaseData).filter(
      field => !allowedFields.includes(field)
    );
    
    if (disallowedFields.length > 0) {
      throw new ValidationError(`Cannot update ${disallowedFields.join(", ")} on ${leaseExists.status} lease`);
    }
  }

  // If dates are being updated, check for conflicts
  if ((leaseData.startDate || leaseData.endDate) && leaseExists.status !== "draft") {
    const newStartDate = leaseData.startDate || leaseExists.startDate;
    const newEndDate = leaseData.endDate || leaseExists.endDate;
    
    // Build date conflict conditions safely
    const dateConflictConditions = [];
    
    // Only add date conditions if both dates are available
    if (newStartDate && newEndDate) {
      dateConflictConditions.push(
        and(
          gte(leases.startDate, newStartDate),
          lte(leases.startDate, newEndDate)
        )
      );
      
      dateConflictConditions.push(
        and(
          gte(leases.endDate, newStartDate),
          lte(leases.endDate, newEndDate)
        )
      );
      
      dateConflictConditions.push(
        and(
          lte(leases.startDate, newStartDate),
          gte(leases.endDate, newEndDate)
        )
      );
    }

    const conflictingLeases = await db.query.leases.findMany({
      where: and(
        eq(leases.unitId, leaseExists.unitId),
        inArray(leases.status, ["active", "pendingMoveIn"]),
        sql`id != ${leaseId}`,
        or(...dateConflictConditions)
      ),
      columns: { id: true }
    });

    if (conflictingLeases.length > 0) {
      throw new ConflictError("Updated lease dates conflict with existing lease for this unit");
    }
  }

  // Prepare update data
  const updateData: any = {
    updatedAt: new Date(),
  };

  // Only include fields that are provided
  if (leaseData.propertyId !== undefined) updateData.propertyId = leaseData.propertyId;
  if (leaseData.unitId !== undefined) updateData.unitId = leaseData.unitId;
  if (leaseData.tenantUserId !== undefined) updateData.tenantUserId = leaseData.tenantUserId;
  if (leaseData.startDate !== undefined) updateData.startDate = leaseData.startDate;
  if (leaseData.endDate !== undefined) updateData.endDate = leaseData.endDate;
  if (leaseData.rentAmount !== undefined) updateData.rentAmount = leaseData.rentAmount.toString();
  if (leaseData.depositAmount !== undefined) updateData.depositAmount = leaseData.depositAmount.toString();
  if (leaseData.dueDayOfMonth !== undefined) updateData.dueDayOfMonth = leaseData.dueDayOfMonth;
  if (leaseData.billingCurrency !== undefined) updateData.billingCurrency = leaseData.billingCurrency;
  if (leaseData.lateFeePercent !== undefined) updateData.lateFeePercent = leaseData.lateFeePercent.toString();
  if (leaseData.notes !== undefined) updateData.notes = leaseData.notes || null;
  if (leaseData.metadata !== undefined) updateData.metadata = leaseData.metadata || {};

  const result = await db.update(leases)
    .set(updateData)
    .where(eq(leases.id, leaseId))
    .returning();
  
  return result[0];
};

/**
 * Update lease status
 */
export const updateLeaseStatusServices = async (
  leaseId: string,
  status: LeaseStatusEnum,
  statusData: LeaseStatusChangeInput
): Promise<Lease> => {
  // Check if lease exists
  const lease = await db.query.leases.findFirst({
    where: eq(leases.id, leaseId),
    columns: { id: true, status: true, unitId: true }
  });

  if (!lease) {
    throw new NotFoundError("Lease");
  }

  // Validate status transition
  const validTransitions: Record<string, LeaseStatusEnum[]> = {
    draft: ["active", "pendingMoveIn", "cancelled"],
    pendingMoveIn: ["active", "cancelled"],
    active: ["ended", "terminated"],
    ended: [],
    terminated: [],
    cancelled: [],
  };

  if (!validTransitions[lease.status]?.includes(status)) {
    throw new ValidationError(`Cannot transition from ${lease.status} to ${status}`);
  }

  // If activating lease, update unit status
  if (status === "active" || status === "pendingMoveIn") {
    const unitStatus = status === "active" ? "occupied" : "reserved";
    
    await db.update(units)
      .set({ 
        status: unitStatus,
        updatedAt: new Date(),
      })
      .where(eq(units.id, lease.unitId));
  }

  // If ending or cancelling lease, set unit back to vacant
  if (["ended", "terminated", "cancelled"].includes(status)) {
    await db.update(units)
      .set({ 
        status: "vacant",
        updatedAt: new Date(),
      })
      .where(eq(units.id, lease.unitId));
  }

  const result = await db.update(leases)
    .set({ 
      status,
      updatedAt: new Date(),
      metadata: sql`COALESCE(metadata, '{}'::jsonb) || ${JSON.stringify({
        statusChange: {
          reason: statusData.reason,
          notes: statusData.notes,
          effectiveDate: statusData.effectiveDate.toISOString(),
          changedAt: new Date().toISOString(),
        }
      })}`
    })
    .where(eq(leases.id, leaseId))
    .returning();
  
  return result[0];
};

/**
 * Delete a lease (only allowed for drafts)
 */
export const deleteLeaseServices = async (
  leaseId: string
): Promise<Lease> => {
  // Check if lease exists and is a draft
  const lease = await db.query.leases.findFirst({
    where: eq(leases.id, leaseId),
    columns: { id: true, status: true }
  });

  if (!lease) {
    throw new NotFoundError("Lease");
  }

  if (lease.status !== "draft") {
    throw new ValidationError("Only draft leases can be deleted");
  }

  const result = await db.delete(leases)
    .where(eq(leases.id, leaseId))
    .returning();
  
  return result[0];
};

/**
 * Get leases for a specific tenant
 */
export const getLeasesByTenantServices = async (
  tenantId: string
): Promise<Lease[]> => {
  // Check if tenant exists
  const tenantExists = await db.query.users.findFirst({
    where: eq(users.id, tenantId),
    columns: { id: true }
  });

  if (!tenantExists) {
    throw new NotFoundError("Tenant");
  }

  return await db.query.leases.findMany({
    where: eq(leases.tenantUserId, tenantId),
    with: {
      organization: {
        columns: {
          id: true,
          name: true,
        }
      },
      property: {
        columns: {
          id: true,
          name: true,
        }
      },
      unit: {
        columns: {
          id: true,
          code: true,
        }
      },
    },
    orderBy: [desc(leases.createdAt)],
  });
};

/**
 * Get leases for a specific property
 */
export const getLeasesByPropertyServices = async (
  propertyId: string
): Promise<Lease[]> => {
  // Check if property exists
  const propertyExists = await db.query.properties.findFirst({
    where: eq(properties.id, propertyId),
    columns: { id: true }
  });

  if (!propertyExists) {
    throw new NotFoundError("Property");
  }

  return await db.query.leases.findMany({
    where: eq(leases.propertyId, propertyId),
    with: {
      organization: {
        columns: {
          id: true,
          name: true,
        }
      },
      tenant: {
        columns: {
          id: true,
          fullName: true,
          email: true,
        }
      },
      unit: {
        columns: {
          id: true,
          code: true,
        }
      },
    },
    orderBy: [desc(leases.createdAt)],
  });
};

/**
 * Calculate outstanding balance for a lease
 */
export const getLeaseBalanceServices = async (
  leaseId: string
): Promise<{ outstandingBalance: number; currency: string }> => {
  // Check if lease exists
  const lease = await db.query.leases.findFirst({
    where: eq(leases.id, leaseId),
    columns: { id: true, billingCurrency: true }
  });

  if (!lease) {
    throw new NotFoundError("Lease");
  }

  // Get all invoices for this lease
  const leaseInvoices = await db.query.invoices.findMany({
    where: and(
      eq(invoices.leaseId, leaseId),
      inArray(invoices.status, ["issued", "partiallyPaid", "overdue"])
    ),
    columns: {
      id: true,
      balanceAmount: true,
      currency: true,
    }
  });

  // Calculate total outstanding balance
  const outstandingBalance = leaseInvoices.reduce((total, invoice) => {
    return total + parseFloat(invoice.balanceAmount);
  }, 0);

  return {
    outstandingBalance,
    currency: lease.billingCurrency,
  };
};

/**
 * Renew a lease (create a new lease based on expiring one)
 */
export const renewLeaseServices = async (
  leaseId: string,
  renewalData: LeaseRenewalInput
): Promise<Lease> => {
  // Get the existing lease
  const existingLease = await db.query.leases.findFirst({
    where: eq(leases.id, leaseId),
    columns: {
      id: true,
      organizationId: true,
      propertyId: true,
      unitId: true,
      tenantUserId: true,
      dueDayOfMonth: true,
      billingCurrency: true,
      lateFeePercent: true,
      status: true,
    }
  });

  if (!existingLease) {
    throw new NotFoundError("Lease");
  }

  // Check if lease can be renewed (active or ending soon)
  if (!["active", "ended"].includes(existingLease.status)) {
    throw new ValidationError("Only active or ended leases can be renewed");
  }

  // Create new lease based on existing one
  const newLeaseData: LeaseInput = {
  organizationId: existingLease.organizationId,
  propertyId: existingLease.propertyId,
  unitId: existingLease.unitId,
  tenantUserId: existingLease.tenantUserId,
  startDate: renewalData.startDate,
  endDate: renewalData.endDate,
  rentAmount: renewalData.rentAmount,
  depositAmount: 0,
  dueDayOfMonth: existingLease.dueDayOfMonth,
  billingCurrency: existingLease.billingCurrency,
  lateFeePercent: parseFloat(existingLease.lateFeePercent || "0"), // Handle null case
  notes: renewalData.notes,
  metadata: {},
};

  return await createLeaseServices(newLeaseData);
};

/**
 * Generate first invoice when activating a lease
 */
export const generateFirstInvoiceServices = async (
  leaseId: string
): Promise<any> => {
  const lease = await db.query.leases.findFirst({
    where: eq(leases.id, leaseId),
    columns: {
      id: true,
      organizationId: true,
      rentAmount: true,
      billingCurrency: true,
      dueDayOfMonth: true,
      startDate: true,
    }
  });

  if (!lease) {
    throw new NotFoundError("Lease");
  }

  // Calculate prorated amount if needed
  const startDate = new Date(lease.startDate);
  const today = new Date();
  const daysInMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate();
  
  let proratedAmount = parseFloat(lease.rentAmount);
  let description = "First month rent";

  // If start date is not the first of the month, calculate prorated amount
  if (startDate.getDate() !== 1) {
    const daysRemaining = daysInMonth - startDate.getDate() + 1;
    const dailyRate = parseFloat(lease.rentAmount) / daysInMonth;
    proratedAmount = Math.round(dailyRate * daysRemaining * 100) / 100;
    description = `Prorated rent for ${daysRemaining} days`;
  }

  // Generate invoice number (organization-specific sequence)
  const invoiceCount = await db
    .select({ count: sql<number>`count(*)` })
    .from(invoices)
    .where(eq(invoices.organizationId, lease.organizationId));

  const invoiceNumber = `INV-${(invoiceCount[0]?.count || 0) + 1}`.padStart(6, '0');

  // Calculate due date (based on lease dueDayOfMonth)
  const dueDate = new Date();
  dueDate.setDate(lease.dueDayOfMonth);
  if (dueDate < today) {
    dueDate.setMonth(dueDate.getMonth() + 1);
  }

  // Create invoice
  const invoice = await db.insert(invoices)
    .values({
      organizationId: lease.organizationId,
      leaseId: lease.id,
      invoiceNumber,
      status: "issued",
      issueDate: today,
      dueDate,
      currency: lease.billingCurrency,
      subtotalAmount: proratedAmount.toString(),
      taxAmount: "0",
      totalAmount: proratedAmount.toString(),
      balanceAmount: proratedAmount.toString(),
    })
    .returning();

  // Add invoice item
  await db.insert(invoiceItems)
    .values({
      invoiceId: invoice[0].id,
      description,
      quantity: "1",
      unitPrice: proratedAmount.toString(),
      lineTotal: proratedAmount.toString(),
    });

  return invoice[0];
};