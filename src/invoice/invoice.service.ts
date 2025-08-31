// src/modules/invoice/invoice.service.ts
import { eq, and, desc, sql, gte, lte } from "drizzle-orm";
import { 
  InvoiceInput, 
  PartialInvoiceInput, 
  InvoiceStatusChangeInput,
  InvoiceItemInput,
  InvoiceQueryParams,
  BatchGenerateInvoicesInput,
  VoidInvoiceInput
} from "./invoice.validator";
import { ValidationError, NotFoundError, ConflictError } from "../utils/errorHandler";
import db from "../drizzle/db";
import { Invoice, invoices, 
  invoiceItems, 
  leases,
  InvoiceStatusEnum,
  paymentAllocations } from "../drizzle/schema";

/**
 * Get all invoices with optional filtering and pagination
 */
export const getInvoicesService = async (
  queryParams: InvoiceQueryParams
): Promise<{ invoices: Invoice[]; total: number }> => {
  const { status, leaseId, organizationId, page, limit, startDate, endDate } = queryParams;
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

  const whereClause = whereConditions.length > 0 
    ? and(...whereConditions) 
    : undefined;

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
            }
          }
        },
        organization: {
          columns: {
            id: true,
            name: true,
          }
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
              }
            }
          }
        }
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
    console.error('Error in getInvoicesService:', error);
    throw error;
  }
};

/**
 * Get invoice by ID with detailed information
 */
export const getInvoiceByIdService = async (
  invoiceId: string
): Promise<Invoice | undefined> => {
  return await db.query.invoices.findFirst({
    where: eq(invoices.id, invoiceId),
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
            },
            with: {
              organization: {
                columns: {
                  id: true,
                  name: true,
                  legalName: true,
                }
              }
            }
          },
          unit: {
            columns: {
              id: true,
              code: true,
              bedrooms: true,
              bathrooms: true,
            }
          }
        }
      },
      organization: {
        columns: {
          id: true,
          name: true,
          legalName: true,
          taxId: true,
        }
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
                }
              }
            }
          }
        }
      }
    }
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
    where: eq(leases.id, invoiceData.leaseId),
    columns: { id: true, organizationId: true }
  });

  if (!lease) {
    throw new NotFoundError("Lease");
  }

  if (lease.organizationId !== organizationId) {
    throw new ValidationError("Lease does not belong to your organization");
  }

  // Check if invoice number is unique within the organization
  const existingInvoice = await db.query.invoices.findFirst({
    where: and(
      eq(invoices.organizationId, organizationId),
      eq(invoices.invoiceNumber, invoiceData.invoiceNumber)
    )
  });

  if (existingInvoice) {
    throw new ConflictError("Invoice with this number already exists in the organization");
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

  const result = await db.insert(invoices)
    .values(insertData)
    .returning();
  
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
    columns: { id: true, status: true, invoiceNumber: true }
  });

  if (!invoice) {
    throw new NotFoundError("Invoice");
  }

  // Cannot update issued or paid invoices
  if (invoice.status !== "draft") {
    throw new ValidationError("Can only update draft invoices");
  }

  // If invoice number is being updated, check if it's unique within the organization
  if (invoiceData.invoiceNumber && invoiceData.invoiceNumber !== invoice.invoiceNumber) {
    const existingInvoice = await db.query.invoices.findFirst({
      where: and(
        eq(invoices.organizationId, organizationId),
        eq(invoices.invoiceNumber, invoiceData.invoiceNumber)
      )
    });

    if (existingInvoice) {
      throw new ConflictError("Invoice with this number already exists in the organization");
    }
  }

  // Prepare update data
  const updateData: any = {
    updatedAt: new Date(),
  };

  // Only include fields that are provided
  if (invoiceData.invoiceNumber !== undefined) updateData.invoiceNumber = invoiceData.invoiceNumber;
  if (invoiceData.issueDate !== undefined) updateData.issueDate = invoiceData.issueDate;
  if (invoiceData.dueDate !== undefined) updateData.dueDate = invoiceData.dueDate;
  if (invoiceData.currency !== undefined) updateData.currency = invoiceData.currency;
  if (invoiceData.notes !== undefined) updateData.notes = invoiceData.notes;
  if (invoiceData.metadata !== undefined) updateData.metadata = invoiceData.metadata;

  const result = await db.update(invoices)
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
    columns: { id: true, status: true }
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
    throw new ValidationError(`Invalid status transition from ${invoice.status} to ${status}`);
  }

  const result = await db.update(invoices)
    .set({ 
      status,
      updatedAt: new Date(),
      metadata: sql`COALESCE(metadata, '{}'::jsonb) || ${JSON.stringify({
        statusChange: {
          reason: statusData.reason,
          notes: statusData.notes,
          changedAt: new Date().toISOString(),
        }
      })}`
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
    columns: { id: true, status: true, balanceAmount: true }
  });

  if (!invoice) {
    throw new NotFoundError("Invoice");
  }

  // Cannot void paid invoices
  if (invoice.status === "paid") {
    throw new ValidationError("Cannot void a paid invoice");
  }

  // Check if there are payments allocated to this invoice
  if (parseFloat(invoice.balanceAmount) > 0) {
    const allocations = await db.query.paymentAllocations.findMany({
      where: eq(paymentAllocations.invoiceId, invoiceId),
      columns: { id: true }
    });

    if (allocations.length > 0) {
      throw new ValidationError("Cannot void invoice with payments allocated");
    }
  }

  const result = await db.update(invoices)
    .set({ 
      status: "void",
      updatedAt: new Date(),
      metadata: sql`COALESCE(metadata, '{}'::jsonb) || ${JSON.stringify({
        voidReason: voidData.reason,
        voidNotes: voidData.notes,
        voidedAt: new Date().toISOString(),
      })}`
    })
    .where(eq(invoices.id, invoiceId))
    .returning();
  
  return result[0];
};

/**
 * Add item to invoice
 */
export const addInvoiceItemService = async (
  invoiceId: string,
  itemData: InvoiceItemInput,
  organizationId: string
): Promise<any> => {
  // Check if invoice exists and belongs to the organization
  const invoice = await db.query.invoices.findFirst({
    where: and(
      eq(invoices.id, invoiceId),
      eq(invoices.organizationId, organizationId)
    ),
    columns: { id: true, status: true, subtotalAmount: true, taxAmount: true, totalAmount: true, balanceAmount: true }
  });

  if (!invoice) {
    throw new NotFoundError("Invoice");
  }

  // Cannot add items to non-draft invoices
  if (invoice.status !== "draft") {
    throw new ValidationError("Can only add items to draft invoices");
  }

  // Calculate line total
  const lineTotal = itemData.quantity * itemData.unitPrice;

  // Insert the item
  const itemResult = await db.insert(invoiceItems)
    .values({
      invoiceId,
      description: itemData.description,
      quantity: lineTotal.toString(),
      unitPrice: itemData.unitPrice.toString(),
      lineTotal: lineTotal.toString(),
      metadata: itemData.metadata || {},
    })
    .returning();

  // Update invoice totals
  const newSubtotal = parseFloat(invoice.subtotalAmount) + lineTotal;
  const newTotal = newSubtotal + parseFloat(invoice.taxAmount);
  const newBalance = newTotal - (parseFloat(invoice.totalAmount) - parseFloat(invoice.balanceAmount));

  await db.update(invoices)
    .set({
      subtotalAmount: newSubtotal.toString(),
      totalAmount: newTotal.toString(),
      balanceAmount: newBalance.toString(),
      updatedAt: new Date(),
    })
    .where(eq(invoices.id, invoiceId));

  return itemResult[0];
};

/**
 * Update invoice item
 */
export const updateInvoiceItemService = async (
  itemId: string,
  itemData: Partial<InvoiceItemInput>,
  organizationId: string
): Promise<any> => {
  // Check if item exists and belongs to the organization
  const item = await db.query.invoiceItems.findFirst({
    where: eq(invoiceItems.id, itemId),
    with: {
      invoice: {
        columns: { id: true, organizationId: true, status: true, subtotalAmount: true, taxAmount: true, totalAmount: true, balanceAmount: true }
      }
    }
  });

  if (!item) {
    throw new NotFoundError("Invoice item");
  }

  if (item.invoice.organizationId !== organizationId) {
    throw new ValidationError("Invoice item does not belong to your organization");
  }

  // Cannot update items in non-draft invoices
  if (item.invoice.status !== "draft") {
    throw new ValidationError("Can only update items in draft invoices");
  }

  // Prepare update data
  const updateData: any = {
    updatedAt: new Date(),
  };

  if (itemData.description !== undefined) updateData.description = itemData.description;
  if (itemData.quantity !== undefined) updateData.quantity = itemData.quantity.toString();
  if (itemData.unitPrice !== undefined) updateData.unitPrice = itemData.unitPrice.toString();

  // If quantity or unit price changed, recalculate line total
  if (itemData.quantity !== undefined || itemData.unitPrice !== undefined) {
    const quantity = itemData.quantity !== undefined ? itemData.quantity : parseFloat(item.quantity);
    const unitPrice = itemData.unitPrice !== undefined ? itemData.unitPrice : parseFloat(item.unitPrice);
    updateData.lineTotal = (quantity * unitPrice).toString();
  }

  if (itemData.metadata !== undefined) updateData.metadata = itemData.metadata;

  const result = await db.update(invoiceItems)
    .set(updateData)
    .where(eq(invoiceItems.id, itemId))
    .returning();

  // Recalculate invoice totals
  const items = await db.query.invoiceItems.findMany({
    where: eq(invoiceItems.invoiceId, item.invoice.id),
    columns: { lineTotal: true }
  });

  const newSubtotal = items.reduce((sum, item) => sum + parseFloat(item.lineTotal), 0);
  const newTotal = newSubtotal + parseFloat(item.invoice.taxAmount);
  const newBalance = newTotal - (parseFloat(item.invoice.totalAmount) - parseFloat(item.invoice.balanceAmount));

  await db.update(invoices)
    .set({
      subtotalAmount: newSubtotal.toString(),
      totalAmount: newTotal.toString(),
      balanceAmount: newBalance.toString(),
      updatedAt: new Date(),
    })
    .where(eq(invoices.id, item.invoice.id));

  return result[0];
};

/**
 * Remove invoice item
 */
export const removeInvoiceItemService = async (
  itemId: string,
  organizationId: string
): Promise<any> => {
  // Check if item exists and belongs to the organization
  const item = await db.query.invoiceItems.findFirst({
    where: eq(invoiceItems.id, itemId),
    with: {
      invoice: {
        columns: { id: true, organizationId: true, status: true, subtotalAmount: true, taxAmount: true, totalAmount: true, balanceAmount: true }
      }
    }
  });

  if (!item) {
    throw new NotFoundError("Invoice item");
  }

  if (item.invoice.organizationId !== organizationId) {
    throw new ValidationError("Invoice item does not belong to your organization");
  }

  // Cannot remove items from non-draft invoices
  if (item.invoice.status !== "draft") {
    throw new ValidationError("Can only remove items from draft invoices");
  }

  const result = await db.delete(invoiceItems)
    .where(eq(invoiceItems.id, itemId))
    .returning();

  // Recalculate invoice totals
  const items = await db.query.invoiceItems.findMany({
    where: eq(invoiceItems.invoiceId, item.invoice.id),
    columns: { lineTotal: true }
  });

  const newSubtotal = items.reduce((sum, item) => sum + parseFloat(item.lineTotal), 0);
  const newTotal = newSubtotal + parseFloat(item.invoice.taxAmount);
  const newBalance = newTotal - (parseFloat(item.invoice.totalAmount) - parseFloat(item.invoice.balanceAmount));

  await db.update(invoices)
    .set({
      subtotalAmount: newSubtotal.toString(),
      totalAmount: newTotal.toString(),
      balanceAmount: newBalance.toString(),
      updatedAt: new Date(),
    })
    .where(eq(invoices.id, item.invoice.id));

  return result[0];
};

/**
 * Generate monthly invoices for all active leases
 */
export const batchGenerateInvoicesService = async (
  batchData: BatchGenerateInvoicesInput,
  organizationId: string
): Promise<{ generated: number; skipped: number }> => {
  const { month, year, dueDay } = batchData;
  
  // Get all active leases for the organization
  const activeLeases = await db.query.leases.findMany({
    where: and(
      eq(leases.organizationId, organizationId),
      eq(leases.status, "active")
    ),
    with: {
      unit: {
        columns: { code: true }
      },
      property: {
        columns: { name: true }
      }
    }
  });

  let generated = 0;
  let skipped = 0;

  // Generate invoice for each lease
  for (const lease of activeLeases) {
    try {
      // Check if invoice already exists for this period
      const startOfMonth = new Date(year, month - 1, 1);
      const endOfMonth = new Date(year, month, 0);
      
      const existingInvoice = await db.query.invoices.findFirst({
        where: and(
          eq(invoices.leaseId, lease.id),
          eq(invoices.organizationId, organizationId),
          gte(invoices.issueDate, startOfMonth),
          lte(invoices.issueDate, endOfMonth)
        )
      });

      if (existingInvoice) {
        skipped++;
        continue;
      }

      // Generate invoice number
      const invoiceNumber = `INV-${year}${month.toString().padStart(2, '0')}-${lease.id.slice(0, 8).toUpperCase()}`;

      // Calculate due date
      const dueDate = new Date(year, month - 1, dueDay);
      if (dueDate < new Date()) {
        dueDate.setMonth(dueDate.getMonth() + 1);
      }

      // Create invoice
      await db.insert(invoices)
        .values({
          organizationId,
          leaseId: lease.id,
          invoiceNumber,
          status: "issued",
          issueDate: new Date(),
          dueDate,
          currency: lease.billingCurrency,
          subtotalAmount: lease.rentAmount.toString(),
          taxAmount: "0",
          totalAmount: lease.rentAmount.toString(),
          balanceAmount: lease.rentAmount.toString(),
          notes: `Rent for ${new Date(year, month - 1).toLocaleString('default', { month: 'long', year: 'numeric' })} - ${lease.property.name} - Unit ${lease.unit.code}`,
        });

      generated++;
    } catch (error) {
      console.error(`Error generating invoice for lease ${lease.id}:`, error);
      skipped++;
    }
  }

  return { generated, skipped };
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
    with: {
      unit: {
        columns: { code: true }
      },
      property: {
        columns: { name: true }
      }
    }
  });

  if (!lease) {
    throw new NotFoundError("Lease");
  }

  // Check if invoice already exists for this month
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);
  
  const existingInvoice = await db.query.invoices.findFirst({
    where: and(
      eq(invoices.leaseId, leaseId),
      eq(invoices.organizationId, organizationId),
      gte(invoices.issueDate, startOfMonth),
      lte(invoices.issueDate, endOfMonth)
    )
  });

  if (existingInvoice) {
    throw new ConflictError("Invoice already exists for this month");
  }

  // Generate invoice number
  const invoiceNumber = `INV-${now.getFullYear()}${(now.getMonth() + 1).toString().padStart(2, '0')}-${lease.id.slice(0, 8).toUpperCase()}`;

  // Calculate due date (use lease's due day)
  const dueDate = new Date(now.getFullYear(), now.getMonth(), lease.dueDayOfMonth);
  if (dueDate < now) {
    dueDate.setMonth(dueDate.getMonth() + 1);
  }

  // Create invoice
  const result = await db.insert(invoices)
    .values({
      organizationId,
      leaseId,
      invoiceNumber,
      status: "issued",
      issueDate: now,
      dueDate,
      currency: lease.billingCurrency,
      subtotalAmount: lease.rentAmount.toString(),
      taxAmount: "0",
      totalAmount: lease.rentAmount.toString(),
      balanceAmount: lease.rentAmount.toString(),
      notes: `Rent for ${now.toLocaleString('default', { month: 'long', year: 'numeric' })} - ${lease.property.name} - Unit ${lease.unit.code}`,
    })
    .returning();

  return result[0];
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
    columns: { id: true }
  });

  if (!lease) {
    throw new NotFoundError("Lease");
  }

  return await db.query.invoices.findMany({
    where: eq(invoices.leaseId, leaseId),
    with: {
      items: true,
      allocations: {
        with: {
          payment: {
            columns: {
              id: true,
              amount: true,
              method: true,
              status: true,
              receivedAt: true,
            }
          }
        }
      }
    },
    orderBy: [desc(invoices.issueDate)],
  });
};

/**
 * Send payment reminder for an invoice
 */
export const sendInvoiceReminderService = async (
  invoiceId: string,
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
              fullName: true,
              email: true,
              phone: true,
            }
          }
        }
      }
    }
  });

  if (!invoice) {
    throw new NotFoundError("Invoice");
  }

  // Only send reminders for issued or overdue invoices
  if (!["issued", "overdue"].includes(invoice.status)) {
    throw new ValidationError("Can only send reminders for issued or overdue invoices");
  }

  // In a real implementation, you would integrate with email/SMS service here
  const tenant = invoice.lease.tenant;
  const message = `Reminder: Invoice ${invoice.invoiceNumber} for KES ${invoice.totalAmount} is due on ${invoice.dueDate.toLocaleDateString()}.`;

  // Simulate sending reminder
  console.log(`Sending reminder to ${tenant.email}: ${message}`);
  
  // Update invoice metadata with reminder sent
  await db.update(invoices)
    .set({
      metadata: sql`COALESCE(metadata, '{}'::jsonb) || ${JSON.stringify({
        lastReminderSent: new Date().toISOString(),
        reminderCount: (invoice.metadata as any)?.reminderCount ? (invoice.metadata as any).reminderCount + 1 : 1
      })}`,
      updatedAt: new Date(),
    })
    .where(eq(invoices.id, invoiceId));

  return {
    success: true,
    message: `Reminder sent to ${tenant.email}`
  };
};