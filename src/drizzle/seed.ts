// seed.ts
import db from "./db";
import {
  users,
  organizations,
  userOrganizations,
  properties,
  propertyManagers,
  units,
  amenities,
  unitAmenities,
  leases,
  invoices,
  invoiceItems,
  payments,
  paymentAllocations,
  receipts,
  maintenanceRequests,
  maintenanceComments,
  maintenanceAttachments,
  activityLogs,
  userAuth,
  refreshTokens,
} from "./schema";
import * as bcrypt from "bcrypt";

// Helper function to generate random dates within a range
const randomDate = (start: Date, end: Date): Date => {
  return new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime()));
};

export async function seed() {
  console.log("Seeding database...");

  // Clear existing data (be careful in production!)
  // You might want to disable this in production environments
  console.log("Clearing existing data...");
  const tables = [
    maintenanceAttachments,
    maintenanceComments,
    maintenanceRequests,
    receipts,
    paymentAllocations,
    payments,
    invoiceItems,
    invoices,
    leases,
    unitAmenities,
    amenities,
    units,
    propertyManagers,
    properties,
    userOrganizations,
    organizations,
    refreshTokens,
    userAuth,
    users,
    activityLogs,
  ];

  for (const table of tables) {
    await db.delete(table);
  }

  // Create users
  console.log("Creating users...");
  const [adminUser, managerUser, tenantUser1, tenantUser2, caretakerUser] = await db
    .insert(users)
    .values([
      {
        fullName: "Admin User",
        email: "admin@example.com",
        phone: "+254700000001",
        isActive: true,
        avatarUrl: "https://example.com/avatars/admin.jpg",
      },
      {
        fullName: "Property Manager",
        email: "manager@example.com",
        phone: "+254700000002",
        isActive: true,
        avatarUrl: "https://example.com/avatars/manager.jpg",
      },
      {
        fullName: "John Tenant",
        email: "tenant1@example.com",
        phone: "+254700000003",
        isActive: true,
        avatarUrl: "https://example.com/avatars/tenant1.jpg",
      },
      {
        fullName: "Jane Tenant",
        email: "tenant2@example.com",
        phone: "+254700000004",
        isActive: true,
        avatarUrl: "https://example.com/avatars/tenant2.jpg",
      },
      {
        fullName: "Mike Caretaker",
        email: "caretaker@example.com",
        phone: "+254700000005",
        isActive: true,
        avatarUrl: "https://example.com/avatars/caretaker.jpg",
      },
    ])
    .returning();

  // Create user auth records
  console.log("Creating user auth records...");
  const passwordHash = await bcrypt.hash("password123", 10);
  await db.insert(userAuth).values([
    {
      userId: adminUser.id,
      email: adminUser.email,
      passwordHash,
      isEmailVerified: true,
    },
    {
      userId: managerUser.id,
      email: managerUser.email,
      passwordHash,
      isEmailVerified: true,
    },
    {
      userId: tenantUser1.id,
      email: tenantUser1.email,
      passwordHash,
      isEmailVerified: true,
    },
    {
      userId: tenantUser2.id,
      email: tenantUser2.email,
      passwordHash,
      isEmailVerified: true,
    },
    {
      userId: caretakerUser.id,
      email: caretakerUser.email,
      passwordHash,
      isEmailVerified: true,
    },
  ]);

  // Create organizations
  console.log("Creating organizations...");
  const [organization] = await db
    .insert(organizations)
    .values([
      {
        name: "Nairobi Properties Ltd",
        legalName: "Nairobi Properties Limited",
        taxId: "P051234567K",
        isActive: true,
      },
    ])
    .returning();

  // Create user organizations (assign users to organization with roles)
  console.log("Creating user organizations...");
  await db.insert(userOrganizations).values([
    {
      userId: adminUser.id,
      organizationId: organization.id,
      role: "superAdmin",
      isPrimary: true,
    },
    {
      userId: managerUser.id,
      organizationId: organization.id,
      role: "manager",
      isPrimary: true,
    },
    {
      userId: tenantUser1.id,
      organizationId: organization.id,
      role: "tenant",
      isPrimary: true,
    },
    {
      userId: tenantUser2.id,
      organizationId: organization.id,
      role: "tenant",
      isPrimary: true,
    },
    {
      userId: caretakerUser.id,
      organizationId: organization.id,
      role: "caretaker",
      isPrimary: true,
    },
  ]);

  // Create properties
  console.log("Creating properties...");
  const [property1, property2] = await db
    .insert(properties)
    .values([
      {
        organizationId: organization.id,
        name: "Westlands Apartments",
        description: "Luxury apartments in Westlands, Nairobi",
        addressLine1: "123 Westlands Road",
        city: "Nairobi",
        state: "Nairobi County",
        postalCode: "00100",
        country: "Kenya",
        timezone: "Africa/Nairobi",
        isActive: true,
      },
      {
        organizationId: organization.id,
        name: "Kilimani Heights",
        description: "Modern apartments in Kilimani",
        addressLine1: "456 Kilimani Drive",
        city: "Nairobi",
        state: "Nairobi County",
        postalCode: "00100",
        country: "Kenya",
        timezone: "Africa/Nairobi",
        isActive: true,
      },
    ])
    .returning();

  // Assign property managers
  console.log("Assigning property managers...");
  await db.insert(propertyManagers).values([
    {
      propertyId: property1.id,
      userId: managerUser.id,
      role: "manager",
    },
    {
      propertyId: property2.id,
      userId: managerUser.id,
      role: "manager",
    },
    {
      propertyId: property1.id,
      userId: caretakerUser.id,
      role: "caretaker",
    },
  ]);

  // Create amenities
  console.log("Creating amenities...");
  const [wifi, parking, gym, pool, security] = await db
    .insert(amenities)
    .values([
      {
        organizationId: organization.id,
        name: "Wi-Fi",
        description: "High-speed internet access",
      },
      {
        organizationId: organization.id,
        name: "Parking",
        description: "Dedicated parking space",
      },
      {
        organizationId: organization.id,
        name: "Gym",
        description: "Fitness center",
      },
      {
        organizationId: organization.id,
        name: "Swimming Pool",
        description: "Outdoor swimming pool",
      },
      {
        organizationId: organization.id,
        name: "24/7 Security",
        description: "Round-the-clock security services",
      },
    ])
    .returning();

  // Create units
  console.log("Creating units...");
  const [unit1, unit2, unit3, unit4] = await db
    .insert(units)
    .values([
      {
        propertyId: property1.id,
        code: "A-101",
        floor: 1,
        bedrooms: 2,
        bathrooms: 2,
        sizeSqm: "85.50",
        baseRent: "35000.00",
        status: "occupied",
        isActive: true,
      },
      {
        propertyId: property1.id,
        code: "A-102",
        floor: 1,
        bedrooms: 1,
        bathrooms: 1,
        sizeSqm: "55.75",
        baseRent: "25000.00",
        status: "vacant",
        isActive: true,
      },
      {
        propertyId: property2.id,
        code: "B-201",
        floor: 2,
        bedrooms: 3,
        bathrooms: 2,
        sizeSqm: "110.25",
        baseRent: "55000.00",
        status: "occupied",
        isActive: true,
      },
      {
        propertyId: property2.id,
        code: "B-202",
        floor: 2,
        bedrooms: 2,
        bathrooms: 2,
        sizeSqm: "90.00",
        baseRent: "40000.00",
        status: "reserved",
        isActive: true,
      },
    ])
    .returning();

  // Assign amenities to units
  console.log("Assigning amenities to units...");
  await db.insert(unitAmenities).values([
    { unitId: unit1.id, amenityId: wifi.id },
    { unitId: unit1.id, amenityId: parking.id },
    { unitId: unit1.id, amenityId: security.id },
    { unitId: unit2.id, amenityId: wifi.id },
    { unitId: unit2.id, amenityId: security.id },
    { unitId: unit3.id, amenityId: wifi.id },
    { unitId: unit3.id, amenityId: parking.id },
    { unitId: unit3.id, amenityId: gym.id },
    { unitId: unit3.id, amenityId: pool.id },
    { unitId: unit3.id, amenityId: security.id },
    { unitId: unit4.id, amenityId: wifi.id },
    { unitId: unit4.id, amenityId: parking.id },
    { unitId: unit4.id, amenityId: security.id },
  ]);

  // Create leases
  console.log("Creating leases...");
  const leaseStartDate = new Date();
  leaseStartDate.setMonth(leaseStartDate.getMonth() - 3); // 3 months ago
  const leaseEndDate = new Date();
  leaseEndDate.setFullYear(leaseEndDate.getFullYear() + 1); // 1 year from now

  const [lease1, lease2] = await db
    .insert(leases)
    .values([
      {
        organizationId: organization.id,
        propertyId: property1.id,
        unitId: unit1.id,
        tenantUserId: tenantUser1.id,
        status: "active",
        startDate: leaseStartDate,
        endDate: leaseEndDate,
        rentAmount: "35000.00",
        depositAmount: "70000.00",
        dueDayOfMonth: 5,
        billingCurrency: "KES",
        lateFeePercent: "5.00",
        notes: "First floor unit with parking",
      },
      {
        organizationId: organization.id,
        propertyId: property2.id,
        unitId: unit3.id,
        tenantUserId: tenantUser2.id,
        status: "active",
        startDate: leaseStartDate,
        endDate: leaseEndDate,
        rentAmount: "55000.00",
        depositAmount: "110000.00",
        dueDayOfMonth: 5,
        billingCurrency: "KES",
        lateFeePercent: "5.00",
        notes: "Premium unit with all amenities",
      },
    ])
    .returning();

  // Create invoices
  console.log("Creating invoices...");
  const invoiceDueDate = new Date();
  invoiceDueDate.setDate(5); // Due on 5th of current month
  if (invoiceDueDate < new Date()) {
    invoiceDueDate.setMonth(invoiceDueDate.getMonth() + 1);
  }

  const [invoice1, invoice2, invoice3] = await db
    .insert(invoices)
    .values([
      {
        organizationId: organization.id,
        leaseId: lease1.id,
        invoiceNumber: `INV-${new Date().getFullYear()}-0001`,
        status: "paid",
        issueDate: new Date(leaseStartDate.getFullYear(), leaseStartDate.getMonth(), 1),
        dueDate: new Date(leaseStartDate.getFullYear(), leaseStartDate.getMonth(), 5),
        currency: "KES",
        subtotalAmount: "35000.00",
        taxAmount: "0.00",
        totalAmount: "35000.00",
        balanceAmount: "0.00",
      },
      {
        organizationId: organization.id,
        leaseId: lease1.id,
        invoiceNumber: `INV-${new Date().getFullYear()}-0002`,
        status: "paid",
        issueDate: new Date(leaseStartDate.getFullYear(), leaseStartDate.getMonth() + 1, 1),
        dueDate: new Date(leaseStartDate.getFullYear(), leaseStartDate.getMonth() + 1, 5),
        currency: "KES",
        subtotalAmount: "35000.00",
        taxAmount: "0.00",
        totalAmount: "35000.00",
        balanceAmount: "0.00",
      },
      {
        organizationId: organization.id,
        leaseId: lease1.id,
        invoiceNumber: `INV-${new Date().getFullYear()}-0003`,
        status: "issued",
        issueDate: new Date(),
        dueDate: invoiceDueDate,
        currency: "KES",
        subtotalAmount: "35000.00",
        taxAmount: "0.00",
        totalAmount: "35000.00",
        balanceAmount: "35000.00",
      },
    ])
    .returning();

  // Create invoice items
  console.log("Creating invoice items...");
  await db.insert(invoiceItems).values([
    {
      invoiceId: invoice1.id,
      description: "Monthly Rent",
      quantity: "1",
      unitPrice: "35000.00",
      lineTotal: "35000.00",
    },
    {
      invoiceId: invoice2.id,
      description: "Monthly Rent",
      quantity: "1",
      unitPrice: "35000.00",
      lineTotal: "35000.00",
    },
    {
      invoiceId: invoice3.id,
      description: "Monthly Rent",
      quantity: "1",
      unitPrice: "35000.00",
      lineTotal: "35000.00",
    },
  ]);

  // Create payments
  console.log("Creating payments...");
  const [payment1, payment2] = await db
    .insert(payments)
    .values([
      {
        organizationId: organization.id,
        leaseId: lease1.id,
        receivedFromUserId: tenantUser1.id,
        receivedByUserId: managerUser.id,
        method: "mpesa",
        status: "completed",
        amount: "35000.00",
        currency: "KES",
        referenceCode: "MPE123456789",
        narrative: "Rent payment for March",
        receivedAt: new Date(leaseStartDate.getFullYear(), leaseStartDate.getMonth(), 3),
      },
      {
        organizationId: organization.id,
        leaseId: lease1.id,
        receivedFromUserId: tenantUser1.id,
        receivedByUserId: managerUser.id,
        method: "mpesa",
        status: "completed",
        amount: "35000.00",
        currency: "KES",
        referenceCode: "MPE987654321",
        narrative: "Rent payment for April",
        receivedAt: new Date(leaseStartDate.getFullYear(), leaseStartDate.getMonth() + 1, 2),
      },
    ])
    .returning();

  // Create payment allocations
  console.log("Creating payment allocations...");
  await db.insert(paymentAllocations).values([
    {
      paymentId: payment1.id,
      invoiceId: invoice1.id,
      amountApplied: "35000.00",
    },
    {
      paymentId: payment2.id,
      invoiceId: invoice2.id,
      amountApplied: "35000.00",
    },
  ]);

  // Create receipts
  console.log("Creating receipts...");
  await db.insert(receipts).values([
    {
      organizationId: organization.id,
      paymentId: payment1.id,
      receiptNumber: `RCPT-${new Date().getFullYear()}-0001`,
      issuedAt: new Date(leaseStartDate.getFullYear(), leaseStartDate.getMonth(), 3),
    },
    {
      organizationId: organization.id,
      paymentId: payment2.id,
      receiptNumber: `RCPT-${new Date().getFullYear()}-0002`,
      issuedAt: new Date(leaseStartDate.getFullYear(), leaseStartDate.getMonth() + 1, 2),
    },
  ]);

  // Create maintenance requests
  console.log("Creating maintenance requests...");
  const [maintenanceRequest1, maintenanceRequest2] = await db
    .insert(maintenanceRequests)
    .values([
      {
        organizationId: organization.id,
        propertyId: property1.id,
        unitId: unit1.id,
        createdByUserId: tenantUser1.id,
        assignedToUserId: caretakerUser.id,
        title: "Leaking kitchen faucet",
        description: "The kitchen faucet has been leaking for two days, wasting water.",
        status: "resolved",
        priority: "medium",
        scheduledAt: randomDate(new Date(2023, 5, 1), new Date(2023, 5, 3)),
        resolvedAt: randomDate(new Date(2023, 5, 3), new Date(2023, 5, 5)),
        costAmount: "2500.00",
      },
      {
        organizationId: organization.id,
        propertyId: property2.id,
        unitId: unit3.id,
        createdByUserId: tenantUser2.id,
        title: "AC not cooling properly",
        description: "The air conditioner is running but not cooling the room effectively.",
        status: "inProgress",
        priority: "high",
        scheduledAt: randomDate(new Date(), new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)),
      },
    ])
    .returning();

  // Create maintenance comments
  console.log("Creating maintenance comments...");
  await db.insert(maintenanceComments).values([
    {
      maintenanceRequestId: maintenanceRequest1.id,
      authorUserId: tenantUser1.id,
      body: "The leak seems to be getting worse. Please address as soon as possible.",
    },
    {
      maintenanceRequestId: maintenanceRequest1.id,
      authorUserId: caretakerUser.id,
      body: "I've inspected the faucet. Needs washer replacement. Parts ordered.",
    },
    {
      maintenanceRequestId: maintenanceRequest1.id,
      authorUserId: caretakerUser.id,
      body: "Faucet repaired and working properly now.",
    },
    {
      maintenanceRequestId: maintenanceRequest2.id,
      authorUserId: tenantUser2.id,
      body: "This is especially problematic during the hot afternoons.",
    },
  ]);

  // Create activity logs
  console.log("Creating activity logs...");
  await db.insert(activityLogs).values([
    {
      organizationId: organization.id,
      actorUserId: adminUser.id,
      action: "create",
      targetTable: "organizations",
      targetId: organization.id,
      description: "Created new organization",
    },
    {
      organizationId: organization.id,
      actorUserId: managerUser.id,
      action: "create",
      targetTable: "leases",
      targetId: lease1.id,
      description: "Created new lease agreement",
    },
    {
      organizationId: organization.id,
      actorUserId: tenantUser1.id,
      action: "create",
      targetTable: "maintenanceRequests",
      targetId: maintenanceRequest1.id,
      description: "Submitted maintenance request",
    },
    {
      organizationId: organization.id,
      actorUserId: caretakerUser.id,
      action: "statusChange",
      targetTable: "maintenanceRequests",
      targetId: maintenanceRequest1.id,
      description: "Changed status to resolved",
    },
  ]);

  console.log("Database seeded successfully!");
}

// Run the seed function if this script is executed directly
if (require.main === module) {
  seed()
    .then(() => {
      console.log("Seeding completed!");
      process.exit(0);
    })
    .catch((error) => {
      console.error("Seeding failed:", error);
      process.exit(1);
    });
}