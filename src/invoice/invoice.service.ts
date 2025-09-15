// src/modules/invoice/invoice.service.ts
import { eq, and, desc, sql, gte, lte } from "drizzle-orm";
import {
  InvoiceInput,
  PartialInvoiceInput,
  InvoiceStatusChangeInput,
  InvoiceItemInput,
  InvoiceQueryParams,
  BatchGenerateInvoicesInput,
  VoidInvoiceInput,
  InvoiceReminderInput,
} from "./invoice.validator";
import {
  Invoice,
  InvoiceStatusEnum,
  invoices,
  invoiceItems,
  leases,
  paymentAllocations,
} from "../drizzle/schema";
import db from "../drizzle/db";
import {
  ConflictError,
  ValidationError,
  NotFoundError,
} from "../utils/errorHandler";

/**
 * Get all invoices with optional filtering and pagination
 */
export const getInvoicesService = async (
  queryParams: InvoiceQueryParams
): Promise<{ invoices: Invoice[]; total: number }> => {
  const { status, leaseId, organizationId, page, limit, startDate, endDate } =
    queryParams;
  const offset = (page - 1) * limit;

  // Build where conditions
  const whereConditions = [];

  if (status) {
    whereConditions.push(eq(invoices.status, status));
  }

  if (leaseId) {
    whereConditions.push(eq(invoices.leaseId, leaseId));
  }

  if (organizationId) {
    whereConditions.push(eq(invoices.organizationId, organizationId));
  }

  if (startDate) {
    whereConditions.push(gte(invoices.issueDate, startDate));
  }

  if (endDate) {
    whereConditions.push(lte(invoices.issueDate, endDate));
  }

  const whereClause =
    whereConditions.length > 0 ? and(...whereConditions) : undefined;

  try {
    // Get invoices with related data
    const invoicesList = await db.query.invoices.findMany({
      where: whereClause,
      with: {
        lease: {
          columns: {
            id: true,
            tenantUserId: true,
            propertyId: true,
            unitId: true,
          },
          with: {
            tenant: {
              columns: {
                id: true,
                fullName: true,
                email: true,
              },
            },
            property: {
              columns: {
                id: true,
                name: true,
              },
            },
            unit: {
              columns: {
                id: true,
                code: true,
              },
            },
          },
        },
        organization: {
          columns: {
            id: true,
            name: true,
          },
        },
        items: true,
        allocations: {
          with: {
            payment: {
              columns: {
                id: true,
                amount: true,
                method: true,
                receivedAt: true,
              },
            },
          },
        },
      },
      orderBy: [desc(invoices.issueDate), desc(invoices.createdAt)],
      limit: limit,
      offset: offset,
    });

    // Get total count for pagination
    const totalResult = await db
      .select({ count: sql<number>`count(*)` })
      .from(invoices)
      .where(whereClause || sql`1=1`);

    const total = totalResult[0]?.count || 0;

    return {
      invoices: invoicesList,
      total,
    };
  } catch (error) {
    console.error("Error in getInvoicesService:", error);
    throw error;
  }
};

/**
 * Get invoice by ID with detailed information
 */
export const getInvoiceByIdService = async (
  invoiceId: string,
  organizationId: string
): Promise<Invoice | undefined> => {
  return await db.query.invoices.findFirst({
    where: and(
      eq(invoices.id, invoiceId),
      eq(invoices.organizationId, organizationId)
    ),
    with: {
      lease: {
        columns: {
          id: true,
          tenantUserId: true,
          propertyId: true,
          unitId: true,
          rentAmount: true,
          dueDayOfMonth: true,
        },
        with: {
          tenant: {
            columns: {
              id: true,
              fullName: true,
              email: true,
              phone: true,
            },
          },
          property: {
            columns: {
              id: true,
              name: true,
              addressLine1: true,
              addressLine2: true,
              city: true,
              state: true,
            },
            with: {
              organization: {
                columns: {
                  id: true,
                  name: true,
                  legalName: true,
                },
              },
            },
          },
          unit: {
            columns: {
              id: true,
              code: true,
              bedrooms: true,
              bathrooms: true,
            },
          },
        },
      },
      organization: {
        columns: {
          id: true,
          name: true,
          legalName: true,
          taxId: true,
        },
      },
      items: true,
      allocations: {
        with: {
          payment: {
            columns: {
              id: true,
              amount: true,
              method: true,
              status: true,
              referenceCode: true,
              receivedAt: true,
              narrative: true,
            },
            with: {
              receivedFrom: {
                columns: {
                  id: true,
                  fullName: true,
                },
              },
            },
          },
        },
      },
    },
  });
};

/**
 * Create a new manual invoice
 */
export const createInvoiceService = async (
  invoiceData: InvoiceInput,
  organizationId: string
): Promise<Invoice> => {
  // Check if lease exists and belongs to the organization
  const lease = await db.query.leases.findFirst({
    where: and(
      eq(leases.id, invoiceData.leaseId),
      eq(leases.organizationId, organizationId)
    ),
    columns: { id: true, organizationId: true },
  });

  if (!lease) {
    throw new NotFoundError("Lease");
  }

  // Check if invoice number is unique within the organization
  const existingInvoice = await db.query.invoices.findFirst({
    where: and(
      eq(invoices.organizationId, organizationId),
      eq(invoices.invoiceNumber, invoiceData.invoiceNumber)
    ),
  });

  if (existingInvoice) {
    throw new ConflictError(
      "Invoice with this number already exists in the organization"
    );
  }

  // Calculate initial amounts
  const subtotalAmount = 0;
  const taxAmount = 0;
  const totalAmount = 0;
  const balanceAmount = 0;

  // Prepare data for insertion
  const insertData = {
    organizationId,
    leaseId: invoiceData.leaseId,
    invoiceNumber: invoiceData.invoiceNumber,
    status: "draft" as const,
    issueDate: invoiceData.issueDate || new Date(),
    dueDate: invoiceData.dueDate,
    currency: invoiceData.currency,
    subtotalAmount: subtotalAmount.toString(),
    taxAmount: taxAmount.toString(),
    totalAmount: totalAmount.toString(),
    balanceAmount: balanceAmount.toString(),
    notes: invoiceData.notes || null,
    metadata: invoiceData.metadata || {},
  };

  const result = await db.insert(invoices).values(insertData).returning();

  return result[0];
};

/**
 * Update an existing invoice
 */
export const updateInvoiceService = async (
  invoiceId: string,
  invoiceData: PartialInvoiceInput,
  organizationId: string
): Promise<Invoice> => {
  // Check if invoice exists and belongs to the organization
  const invoice = await db.query.invoices.findFirst({
    where: and(
      eq(invoices.id, invoiceId),
      eq(invoices.organizationId, organizationId)
    ),
    columns: { id: true, status: true, invoiceNumber: true },
  });

  if (!invoice) {
    throw new NotFoundError("Invoice");
  }

  // Cannot update issued or paid invoices
  if (invoice.status !== "draft") {
    throw new ValidationError("Can only update draft invoices");
  }

  // If invoice number is being updated, check if it's unique within the organization
  if (
    invoiceData.invoiceNumber &&
    invoiceData.invoiceNumber !== invoice.invoiceNumber
  ) {
    const existingInvoice = await db.query.invoices.findFirst({
      where: and(
        eq(invoices.organizationId, organizationId),
        eq(invoices.invoiceNumber, invoiceData.invoiceNumber)
      ),
    });

    if (existingInvoice) {
      throw new ConflictError(
        "Invoice with this number already exists in the organization"
      );
    }
  }

  // Prepare update data
  const updateData: any = {
    updatedAt: new Date(),
  };

  // Only include fields that are provided
  if (invoiceData.invoiceNumber !== undefined)
    updateData.invoiceNumber = invoiceData.invoiceNumber;
  if (invoiceData.issueDate !== undefined)
    updateData.issueDate = invoiceData.issueDate;
  if (invoiceData.dueDate !== undefined)
    updateData.dueDate = invoiceData.dueDate;
  if (invoiceData.currency !== undefined)
    updateData.currency = invoiceData.currency;
  if (invoiceData.notes !== undefined) updateData.notes = invoiceData.notes;
  if (invoiceData.metadata !== undefined)
    updateData.metadata = invoiceData.metadata;

  const result = await db
    .update(invoices)
    .set(updateData)
    .where(eq(invoices.id, invoiceId))
    .returning();

  return result[0];
};

/**
 * Update invoice status
 */
export const updateInvoiceStatusService = async (
  invoiceId: string,
  status: InvoiceStatusEnum,
  statusData: InvoiceStatusChangeInput,
  organizationId: string
): Promise<Invoice> => {
  // Check if invoice exists and belongs to the organization
  const invoice = await db.query.invoices.findFirst({
    where: and(
      eq(invoices.id, invoiceId),
      eq(invoices.organizationId, organizationId)
    ),
    columns: { id: true, status: true },
  });

  if (!invoice) {
    throw new NotFoundError("Invoice");
  }

  // Validate status transition
  const validTransitions: Record<InvoiceStatusEnum, InvoiceStatusEnum[]> = {
    draft: ["issued", "void"],
    issued: ["partiallyPaid", "paid", "void", "overdue"],
    partiallyPaid: ["paid", "void"],
    paid: ["void"],
    void: [],
    overdue: ["partiallyPaid", "paid", "void"],
  };

  if (!validTransitions[invoice.status].includes(status)) {
    throw new ValidationError(
      `Invalid status transition from ${invoice.status} to ${status}`
    );
  }

  const result = await db
    .update(invoices)
    .set({
      status,
      updatedAt: new Date(),
      metadata: sql`COALESCE(metadata, '{}'::jsonb) || ${JSON.stringify({
        statusChange: {
          reason: statusData.reason,
          notes: statusData.notes,
          changedAt: new Date().toISOString(),
        },
      })}`,
    })
    .where(eq(invoices.id, invoiceId))
    .returning();

  return result[0];
};

/**
 * Void an invoice
 */
export const voidInvoiceService = async (
  invoiceId: string,
  voidData: VoidInvoiceInput,
  organizationId: string
): Promise<Invoice> => {
  // Check if invoice exists and belongs to the organization
  const invoice = await db.query.invoices.findFirst({
    where: and(
      eq(invoices.id, invoiceId),
      eq(invoices.organizationId, organizationId)
    ),
    columns: { id: true, status: true, balanceAmount: true },
  });

  if (!invoice) {
    throw new NotFoundError("Invoice");
  }

  // Cannot void paid invoices
  if (invoice.status === "paid") {
    throw new ValidationError("Cannot void a paid invoice");
  }

  // Check if there are any payments allocated to this invoice
  const allocations = await db.query.paymentAllocations.findMany({
    where: eq(paymentAllocations.invoiceId, invoiceId),
    columns: { id: true, amountApplied: true },
  });

  if (allocations.length > 0) {
    throw new ValidationError("Cannot void invoice with allocated payments");
  }

  const result = await db
    .update(invoices)
    .set({
      status: "void",
      updatedAt: new Date(),
      metadata: sql`COALESCE(metadata, '{}'::jsonb) || ${JSON.stringify({
        void: {
          reason: voidData.reason,
          notes: voidData.notes,
          voidedAt: new Date().toISOString(),
        },
      })}`,
    })
    .where(eq(invoices.id, invoiceId))
    .returning();

  return result[0];
};

/**
 * Add an item to an invoice
 */
export const addInvoiceItemService = async (
  invoiceId: string,
  itemData: InvoiceItemInput,
  organizationId: string
) => {
  // Check if invoice exists and belongs to the organization
  const invoice = await db.query.invoices.findFirst({
    where: and(
      eq(invoices.id, invoiceId),
      eq(invoices.organizationId, organizationId)
    ),
    columns: {
      id: true,
      status: true,
      subtotalAmount: true,
      taxAmount: true,
      totalAmount: true,
      balanceAmount: true,
    },
  });

  if (!invoice) {
    throw new NotFoundError("Invoice");
  }

  // Cannot add items to non-draft invoices
  if (invoice.status !== "draft") {
    throw new ValidationError("Can only add items to draft invoices");
  }

  // Calculate item amounts
  const quantity = itemData.quantity;
  const unitPrice = itemData.unitPrice;
  const lineTotal = quantity * unitPrice;

  // Insert the item
  const result = await db
    .insert(invoiceItems)
    .values({
      invoiceId,
      description: itemData.description,
      quantity: quantity.toString(),
      unitPrice: unitPrice.toString(),
      lineTotal: lineTotal.toString(),
      metadata: itemData.metadata || {},
    })
    .returning();

  // Update invoice totals
  const currentSubtotal = parseFloat(invoice.subtotalAmount);
  const currentTotal = parseFloat(invoice.totalAmount);
  const currentBalance = parseFloat(invoice.balanceAmount);

  const newSubtotal = currentSubtotal + lineTotal;
  const newTotal = currentTotal + lineTotal;
  const newBalance = currentBalance + lineTotal;

  await db
    .update(invoices)
    .set({
      subtotalAmount: newSubtotal.toString(),
      totalAmount: newTotal.toString(),
      balanceAmount: newBalance.toString(),
      updatedAt: new Date(),
    })
    .where(eq(invoices.id, invoiceId));

  return result[0];
};

/**
 * Update an invoice item
 */
export const updateInvoiceItemService = async (
  invoiceId: string,
  itemId: string,
  itemData: Partial<InvoiceItemInput>,
  organizationId: string
) => {
  // Check if invoice exists and belongs to the organization
  const invoice = await db.query.invoices.findFirst({
    where: and(
      eq(invoices.id, invoiceId),
      eq(invoices.organizationId, organizationId)
    ),
    columns: {
      id: true,
      status: true,
      subtotalAmount: true,
      taxAmount: true,
      totalAmount: true,
      balanceAmount: true,
    },
  });

  if (!invoice) {
    throw new NotFoundError("Invoice");
  }

  // Cannot update items in non-draft invoices
  if (invoice.status !== "draft") {
    throw new ValidationError("Can only update items in draft invoices");
  }

  // Check if item exists and belongs to the invoice
  const item = await db.query.invoiceItems.findFirst({
    where: and(
      eq(invoiceItems.id, itemId),
      eq(invoiceItems.invoiceId, invoiceId)
    ),
  });

  if (!item) {
    throw new NotFoundError("Invoice item");
  }

  // Calculate new amounts
  const oldLineTotal = parseFloat(item.lineTotal);

  const quantity =
    itemData.quantity !== undefined
      ? itemData.quantity
      : parseFloat(item.quantity);
  const unitPrice =
    itemData.unitPrice !== undefined
      ? itemData.unitPrice
      : parseFloat(item.unitPrice);

  const newLineTotal = quantity * unitPrice;

  // Update the item
  const updateData: any = {};

  if (itemData.description !== undefined)
    updateData.description = itemData.description;
  if (itemData.quantity !== undefined)
    updateData.quantity = itemData.quantity.toString();
  if (itemData.unitPrice !== undefined)
    updateData.unitPrice = itemData.unitPrice.toString();

  updateData.lineTotal = newLineTotal.toString();

  if (itemData.metadata !== undefined) {
    updateData.metadata = { ...item.metadata, ...itemData.metadata };
  }

  const result = await db
    .update(invoiceItems)
    .set(updateData)
    .where(eq(invoiceItems.id, itemId))
    .returning();

  // Update invoice totals
  const currentSubtotal = parseFloat(invoice.subtotalAmount);
  const currentTotal = parseFloat(invoice.totalAmount);
  const currentBalance = parseFloat(invoice.balanceAmount);

  const newSubtotal = currentSubtotal - oldLineTotal + newLineTotal;
  const newTotal = currentTotal - oldLineTotal + newLineTotal;
  const newBalance = currentBalance - oldLineTotal + newLineTotal;

  await db
    .update(invoices)
    .set({
      subtotalAmount: newSubtotal.toString(),
      totalAmount: newTotal.toString(),
      balanceAmount: newBalance.toString(),
      updatedAt: new Date(),
    })
    .where(eq(invoices.id, invoiceId));

  return result[0];
};

/**
 * Remove an invoice item
 */
export const removeInvoiceItemService = async (
  invoiceId: string,
  itemId: string,
  organizationId: string
) => {
  // Check if invoice exists and belongs to the organization
  const invoice = await db.query.invoices.findFirst({
    where: and(
      eq(invoices.id, invoiceId),
      eq(invoices.organizationId, organizationId)
    ),
    columns: {
      id: true,
      status: true,
      subtotalAmount: true,
      taxAmount: true,
      totalAmount: true,
      balanceAmount: true,
    },
  });

  if (!invoice) {
    throw new NotFoundError("Invoice");
  }

  // Cannot remove items from non-draft invoices
  if (invoice.status !== "draft") {
    throw new ValidationError("Can only remove items from draft invoices");
  }

  // Check if item exists and belongs to the invoice
  const item = await db.query.invoiceItems.findFirst({
    where: and(
      eq(invoiceItems.id, itemId),
      eq(invoiceItems.invoiceId, invoiceId)
    ),
  });

  if (!item) {
    throw new NotFoundError("Invoice item");
  }

  // Remove the item
  const result = await db
    .delete(invoiceItems)
    .where(eq(invoiceItems.id, itemId))
    .returning();

  // Update invoice totals
  const lineTotal = parseFloat(item.lineTotal);

  const currentSubtotal = parseFloat(invoice.subtotalAmount);
  const currentTotal = parseFloat(invoice.totalAmount);
  const currentBalance = parseFloat(invoice.balanceAmount);

  const newSubtotal = currentSubtotal - lineTotal;
  const newTotal = currentTotal - lineTotal;
  const newBalance = currentBalance - lineTotal;

  await db
    .update(invoices)
    .set({
      subtotalAmount: newSubtotal.toString(),
      totalAmount: newTotal.toString(),
      balanceAmount: newBalance.toString(),
      updatedAt: new Date(),
    })
    .where(eq(invoices.id, invoiceId));

  return result[0];
};

/**
 * Batch generate invoices for all active leases
 */
export const batchGenerateInvoicesService = async (
  batchData: BatchGenerateInvoicesInput,
  organizationId: string
): Promise<{ generated: number; skipped: number; errors: string[] }> => {
  const { month, year, dueDay } = batchData;

  // Get all active leases for the organization
  const activeLeases = await db.query.leases.findMany({
    where: and(
      eq(leases.organizationId, organizationId),
      eq(leases.status, "active")
    ),
    columns: {
      id: true,
      rentAmount: true,
      dueDayOfMonth: true,
      tenantUserId: true,
      propertyId: true,
      unitId: true,
    },
  });

  let generated = 0;
  let skipped = 0;
  const errors: string[] = [];

  // Generate invoices for each lease
  for (const lease of activeLeases) {
    try {
      // Check if invoice already exists for this lease and period
      const existingInvoice = await db.query.invoices.findFirst({
        where: and(
          eq(invoices.leaseId, lease.id),
          eq(invoices.organizationId, organizationId),
          sql`EXTRACT(MONTH FROM issue_date) = ${month}`,
          sql`EXTRACT(YEAR FROM issue_date) = ${year}`
        ),
      });

      if (existingInvoice) {
        skipped++;
        continue;
      }

      // Generate invoice number (YYYYMM-LEASEID)
      const invoiceNumber = `${year}${month
        .toString()
        .padStart(2, "0")}-${lease.id.slice(-6)}`;

      // Determine due date
      const dueDate = new Date(year, month - 1, dueDay);

      // Create invoice
      const invoice = await createInvoiceService(
        {
          leaseId: lease.id,
          invoiceNumber,
          issueDate: new Date(year, month - 1, 1), // First day of the month
          dueDate,
          currency: "KES", // Default currency
        },
        organizationId
      );

      // Add rent item
      await addInvoiceItemService(
        invoice.id,
        {
          description: "Monthly Rent",
          quantity: 1,
          unitPrice: parseFloat(lease.rentAmount.toString()),
        },
        organizationId
      );

      // Issue the invoice
      await updateInvoiceStatusService(
        invoice.id,
        "issued",
        { status: "issued" },
        organizationId
      );

      generated++;
    } catch (error) {
      errors.push(
        `Lease ${lease.id}: ${
          error instanceof Error ? error.message : "Unknown error"
        }`
      );
      skipped++;
    }
  }

  return { generated, skipped, errors };
};

/**
 * Generate invoice for a specific lease
 */
export const generateLeaseInvoiceService = async (
  leaseId: string,
  organizationId: string
): Promise<Invoice> => {
  // Check if lease exists and belongs to the organization
  const lease = await db.query.leases.findFirst({
    where: and(
      eq(leases.id, leaseId),
      eq(leases.organizationId, organizationId)
    ),
    columns: {
      id: true,
      rentAmount: true,
      dueDayOfMonth: true,
      status: true,
    },
  });

  if (!lease) {
    throw new NotFoundError("Lease");
  }

  if (lease.status !== "active") {
    throw new ValidationError("Can only generate invoices for active leases");
  }

  // Generate invoice number (YYYYMMDD-LEASEID)
  const now = new Date();
  const invoiceNumber = `${now.getFullYear()}${(now.getMonth() + 1)
    .toString()
    .padStart(2, "0")}${now
    .getDate()
    .toString()
    .padStart(2, "0")}-${leaseId.slice(-6)}`;

  // Determine due date (current month's due day or 1st of next month)
  const dueDay = lease.dueDayOfMonth || 1;
  const dueDate = new Date(now.getFullYear(), now.getMonth(), dueDay);
  if (dueDate < now) {
    dueDate.setMonth(dueDate.getMonth() + 1);
  }

  // Create invoice
  const invoice = await createInvoiceService(
    {
      leaseId,
      invoiceNumber,
      issueDate: now,
      dueDate,
      currency: "KES",
    },
    organizationId
  );

  // Add rent item
  await addInvoiceItemService(
    invoice.id,
    {
      description: "Monthly Rent",
      quantity: 1,
      unitPrice: parseFloat(lease.rentAmount.toString()),
    },
    organizationId
  );

  // Issue the invoice
  return await updateInvoiceStatusService(
    invoice.id,
    "issued",
    { status: "issued" },
    organizationId
  );
};

/**
 * Get invoices for a specific lease
 */
export const getLeaseInvoicesService = async (
  leaseId: string,
  organizationId: string
): Promise<Invoice[]> => {
  // Check if lease exists and belongs to the organization
  const lease = await db.query.leases.findFirst({
    where: and(
      eq(leases.id, leaseId),
      eq(leases.organizationId, organizationId)
    ),
    columns: { id: true },
  });

  if (!lease) {
    throw new NotFoundError("Lease");
  }

  return await db.query.invoices.findMany({
    where: and(
      eq(invoices.leaseId, leaseId),
      eq(invoices.organizationId, organizationId)
    ),
    with: {
      items: true,
      allocations: {
        with: {
          payment: {
            columns: {
              id: true,
              amount: true,
              method: true,
              receivedAt: true,
            },
          },
        },
      },
    },
    orderBy: [desc(invoices.issueDate)],
  });
};

/**
 * Send invoice payment reminder
 */
export const sendInvoiceReminderService = async (
  invoiceId: string,
  reminderData: InvoiceReminderInput,
  organizationId: string
): Promise<{ success: boolean; message: string }> => {
  // Check if invoice exists and belongs to the organization
  const invoice = await db.query.invoices.findFirst({
    where: and(
      eq(invoices.id, invoiceId),
      eq(invoices.organizationId, organizationId)
    ),
    with: {
      lease: {
        with: {
          tenant: {
            columns: {
              id: true,
              email: true,
              fullName: true,
            },
          },
        },
      },
    },
  });

  if (!invoice) {
    throw new NotFoundError("Invoice");
  }

  // Only send reminders for issued or overdue invoices
  if (!["issued", "overdue"].includes(invoice.status)) {
    throw new ValidationError(
      "Can only send reminders for issued or overdue invoices"
    );
  }

  // TODO: Implement actual email sending logic
  // This would integrate with your email service
  const emailSent = true; // Placeholder

  if (emailSent) {
    // Safely extract existing reminders or use empty array
    const existingReminders = Array.isArray(invoice.metadata?.reminders) 
      ? invoice.metadata.reminders 
      : [];

    // Update invoice metadata with reminder info
    await db
      .update(invoices)
      .set({
        metadata: sql`COALESCE(metadata, '{}'::jsonb) || ${JSON.stringify({
          reminders: [
            ...existingReminders,
            {
              sentAt: new Date().toISOString(),
              method: reminderData.method,
              message: reminderData.message,
              sentTo: invoice.lease.tenant.email,
            },
          ],
        })}`,
        updatedAt: new Date(),
      })
      .where(eq(invoices.id, invoiceId));

    return {
      success: true,
      message: `Reminder sent to ${invoice.lease.tenant.email}`,
    };
  }

  return {
    success: false,
    message: "Failed to send reminder",
  };
};
