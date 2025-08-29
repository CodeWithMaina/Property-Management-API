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

async function seed() {
  console.log("✅ Seeding started...");

  // Clear all tables in reverse order of dependencies
  console.log("🧹 Clearing tables...");
  await db.delete(maintenanceAttachments).execute();
  await db.delete(maintenanceComments).execute();
  await db.delete(maintenanceRequests).execute();
  await db.delete(receipts).execute();
  await db.delete(paymentAllocations).execute();
  await db.delete(payments).execute();
  await db.delete(invoiceItems).execute();
  await db.delete(invoices).execute();
  await db.delete(leases).execute();
  await db.delete(unitAmenities).execute();
  await db.delete(amenities).execute();
  await db.delete(units).execute();
  await db.delete(propertyManagers).execute();
  await db.delete(properties).execute();
  await db.delete(userOrganizations).execute();
  await db.delete(organizations).execute();
  await db.delete(refreshTokens).execute();
  await db.delete(userAuth).execute();
  await db.delete(users).execute();
  await db.delete(activityLogs).execute();

  console.log("🌱 Seeding data...");

  // 1. Users - 10 entries (various roles)
  const userIds = await db
    .insert(users)
    .values([
      {
        fullName: "Super Admin",
        email: "superadmin@example.com",
        phone: "+254700000000",
        isActive: true,
        avatarUrl: "https://example.com/avatars/admin.jpg",
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        fullName: "Property Owner",
        email: "owner@example.com",
        phone: "+254711111111",
        isActive: true,
        avatarUrl: "https://example.com/avatars/owner.jpg",
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        fullName: "Property Manager",
        email: "manager@example.com",
        phone: "+254722222222",
        isActive: true,
        avatarUrl: "https://example.com/avatars/manager.jpg",
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        fullName: "Caretaker",
        email: "caretaker@example.com",
        phone: "+254733333333",
        isActive: true,
        avatarUrl: "https://example.com/avatars/caretaker.jpg",
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        fullName: "Tenant 1",
        email: "tenant1@example.com",
        phone: "+254744444444",
        isActive: true,
        avatarUrl: "https://example.com/avatars/tenant1.jpg",
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        fullName: "Tenant 2",
        email: "tenant2@example.com",
        phone: "+254755555555",
        isActive: true,
        avatarUrl: "https://example.com/avatars/tenant2.jpg",
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        fullName: "Tenant 3",
        email: "tenant3@example.com",
        phone: "+254766666666",
        isActive: true,
        avatarUrl: "https://example.com/avatars/tenant3.jpg",
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        fullName: "Tenant 4",
        email: "tenant4@example.com",
        phone: "+254777777777",
        isActive: true,
        avatarUrl: "https://example.com/avatars/tenant4.jpg",
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        fullName: "Maintenance Staff 1",
        email: "maintenance1@example.com",
        phone: "+254788888888",
        isActive: true,
        avatarUrl: "https://example.com/avatars/maintenance1.jpg",
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        fullName: "Maintenance Staff 2",
        email: "maintenance2@example.com",
        phone: "+254799999999",
        isActive: true,
        avatarUrl: "https://example.com/avatars/maintenance2.jpg",
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ])
    .returning({ id: users.id });

  // 2. User Auth - for some users
  await db.insert(userAuth).values([
    {
      userId: userIds[0].id,
      email: "superadmin@example.com",
      passwordHash: "$2b$10$examplehashedpassword1",
      isEmailVerified: true,
      lastLoginAt: new Date(),
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    {
      userId: userIds[1].id,
      email: "owner@example.com",
      passwordHash: "$2b$10$examplehashedpassword2",
      isEmailVerified: true,
      lastLoginAt: new Date(),
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    {
      userId: userIds[2].id,
      email: "manager@example.com",
      passwordHash: "$2b$10$examplehashedpassword3",
      isEmailVerified: true,
      lastLoginAt: new Date(),
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  ]);

  // 3. Organizations - 2 entries
  const organizationIds = await db
    .insert(organizations)
    .values([
      {
        name: "Nairobi Properties Ltd",
        legalName: "Nairobi Properties Limited",
        taxId: "P051234567K",
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        name: "Mombasa Real Estate",
        legalName: "Mombasa Real Estate Holdings",
        taxId: "M098765432K",
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ])
    .returning({ id: organizations.id });

  // 4. User Organizations - assign users to organizations
  await db.insert(userOrganizations).values([
    {
      userId: userIds[0].id,
      organizationId: organizationIds[0].id,
      role: "superAdmin",
      isPrimary: true,
      createdAt: new Date(),
    },
    {
      userId: userIds[1].id,
      organizationId: organizationIds[0].id,
      role: "propertyOwner",
      isPrimary: true,
      createdAt: new Date(),
    },
    {
      userId: userIds[2].id,
      organizationId: organizationIds[0].id,
      role: "manager",
      isPrimary: true,
      createdAt: new Date(),
    },
    {
      userId: userIds[3].id,
      organizationId: organizationIds[0].id,
      role: "caretaker",
      isPrimary: false,
      createdAt: new Date(),
    },
    {
      userId: userIds[4].id,
      organizationId: organizationIds[0].id,
      role: "tenant",
      isPrimary: false,
      createdAt: new Date(),
    },
    {
      userId: userIds[5].id,
      organizationId: organizationIds[0].id,
      role: "tenant",
      isPrimary: false,
      createdAt: new Date(),
    },
    {
      userId: userIds[0].id,
      organizationId: organizationIds[1].id,
      role: "superAdmin",
      isPrimary: true,
      createdAt: new Date(),
    },
    {
      userId: userIds[6].id,
      organizationId: organizationIds[1].id,
      role: "tenant",
      isPrimary: false,
      createdAt: new Date(),
    },
    {
      userId: userIds[7].id,
      organizationId: organizationIds[1].id,
      role: "tenant",
      isPrimary: false,
      createdAt: new Date(),
    },
  ]);

  // 5. Properties - 3 entries
  const propertyIds = await db
    .insert(properties)
    .values([
      {
        organizationId: organizationIds[0].id,
        name: "Westlands Apartments",
        description: "Luxury apartments in Westlands, Nairobi",
        addressLine1: "123 Westlands Road",
        city: "Nairobi",
        state: "Nairobi County",
        postalCode: "00100",
        country: "Kenya",
        timezone: "Africa/Nairobi",
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        organizationId: organizationIds[0].id,
        name: "Kilimani Towers",
        description: "Modern apartments in Kilimani",
        addressLine1: "456 Kilimani Drive",
        city: "Nairobi",
        state: "Nairobi County",
        postalCode: "00100",
        country: "Kenya",
        timezone: "Africa/Nairobi",
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        organizationId: organizationIds[1].id,
        name: "Nyali Beach Residences",
        description: "Beachfront apartments in Mombasa",
        addressLine1: "789 Beach Road",
        city: "Mombasa",
        state: "Mombasa County",
        postalCode: "80100",
        country: "Kenya",
        timezone: "Africa/Nairobi",
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ])
    .returning({ id: properties.id });

  // 6. Property Managers - assign managers to properties
  await db.insert(propertyManagers).values([
    {
      propertyId: propertyIds[0].id,
      userId: userIds[2].id,
      role: "manager",
      createdAt: new Date(),
    },
    {
      propertyId: propertyIds[1].id,
      userId: userIds[2].id,
      role: "manager",
      createdAt: new Date(),
    },
    {
      propertyId: propertyIds[2].id,
      userId: userIds[2].id,
      role: "manager",
      createdAt: new Date(),
    },
    {
      propertyId: propertyIds[0].id,
      userId: userIds[3].id,
      role: "caretaker",
      createdAt: new Date(),
    },
  ]);

  // 7. Units - 8 entries across properties
  const unitIds = await db
    .insert(units)
    .values([
      // Westlands Apartments
      {
        propertyId: propertyIds[0].id,
        code: "A-101",
        floor: 1,
        bedrooms: 2,
        bathrooms: 2,
        sizeSqm: "85.50",
        baseRent: "45000.00",
        status: "occupied",
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        propertyId: propertyIds[0].id,
        code: "A-102",
        floor: 1,
        bedrooms: 1,
        bathrooms: 1,
        sizeSqm: "55.00",
        baseRent: "32000.00",
        status: "occupied",
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        propertyId: propertyIds[0].id,
        code: "B-201",
        floor: 2,
        bedrooms: 3,
        bathrooms: 2,
        sizeSqm: "110.00",
        baseRent: "65000.00",
        status: "vacant",
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      // Kilimani Towers
      {
        propertyId: propertyIds[1].id,
        code: "KT-101",
        floor: 1,
        bedrooms: 2,
        bathrooms: 2,
        sizeSqm: "90.00",
        baseRent: "48000.00",
        status: "occupied",
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        propertyId: propertyIds[1].id,
        code: "KT-102",
        floor: 1,
        bedrooms: 1,
        bathrooms: 1,
        sizeSqm: "60.00",
        baseRent: "35000.00",
        status: "reserved",
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      // Nyali Beach Residences
      {
        propertyId: propertyIds[2].id,
        code: "NB-101",
        floor: 1,
        bedrooms: 2,
        bathrooms: 2,
        sizeSqm: "95.00",
        baseRent: "55000.00",
        status: "occupied",
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        propertyId: propertyIds[2].id,
        code: "NB-201",
        floor: 2,
        bedrooms: 3,
        bathrooms: 2,
        sizeSqm: "120.00",
        baseRent: "75000.00",
        status: "occupied",
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        propertyId: propertyIds[2].id,
        code: "NB-202",
        floor: 2,
        bedrooms: 1,
        bathrooms: 1,
        sizeSqm: "65.00",
        baseRent: "40000.00",
        status: "vacant",
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ])
    .returning({ id: units.id });

  // 8. Amenities - 5 entries
  const amenityIds = await db
    .insert(amenities)
    .values([
      {
        organizationId: organizationIds[0].id,
        name: "Swimming Pool",
        description: "Outdoor swimming pool",
        createdAt: new Date(),
      },
      {
        organizationId: organizationIds[0].id,
        name: "Gym",
        description: "Fully equipped gym",
        createdAt: new Date(),
      },
      {
        organizationId: organizationIds[0].id,
        name: "Parking",
        description: "Secure parking space",
        createdAt: new Date(),
      },
      {
        organizationId: organizationIds[0].id,
        name: "Security",
        description: "24/7 security personnel",
        createdAt: new Date(),
      },
      {
        organizationId: organizationIds[1].id,
        name: "Beach Access",
        description: "Private beach access",
        createdAt: new Date(),
      },
    ])
    .returning({ id: amenities.id });

  // 9. Unit Amenities - assign amenities to units
  await db.insert(unitAmenities).values([
    {
      unitId: unitIds[0].id,
      amenityId: amenityIds[0].id,
      createdAt: new Date(),
    },
    {
      unitId: unitIds[0].id,
      amenityId: amenityIds[1].id,
      createdAt: new Date(),
    },
    {
      unitId: unitIds[0].id,
      amenityId: amenityIds[2].id,
      createdAt: new Date(),
    },
    {
      unitId: unitIds[0].id,
      amenityId: amenityIds[3].id,
      createdAt: new Date(),
    },
    {
      unitId: unitIds[3].id,
      amenityId: amenityIds[1].id,
      createdAt: new Date(),
    },
    {
      unitId: unitIds[3].id,
      amenityId: amenityIds[2].id,
      createdAt: new Date(),
    },
    {
      unitId: unitIds[5].id,
      amenityId: amenityIds[4].id,
      createdAt: new Date(),
    },
    {
      unitId: unitIds[6].id,
      amenityId: amenityIds[4].id,
      createdAt: new Date(),
    },
  ]);

  // 10. Leases - 5 entries
  const now = new Date();
  const leaseIds = await db
    .insert(leases)
    .values([
      {
        organizationId: organizationIds[0].id,
        propertyId: propertyIds[0].id,
        unitId: unitIds[0].id,
        tenantUserId: userIds[4].id,
        status: "active",
        startDate: new Date(now.getFullYear(), now.getMonth() - 3, 1),
        endDate: new Date(now.getFullYear() + 1, now.getMonth() - 3, 1),
        rentAmount: "45000.00",
        depositAmount: "90000.00",
        dueDayOfMonth: 5,
        billingCurrency: "KES",
        lateFeePercent: "5.00",
        notes: "Long-term lease agreement",
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        organizationId: organizationIds[0].id,
        propertyId: propertyIds[0].id,
        unitId: unitIds[1].id,
        tenantUserId: userIds[5].id,
        status: "active",
        startDate: new Date(now.getFullYear(), now.getMonth() - 1, 15),
        endDate: new Date(now.getFullYear() + 1, now.getMonth() - 1, 15),
        rentAmount: "32000.00",
        depositAmount: "64000.00",
        dueDayOfMonth: 15,
        billingCurrency: "KES",
        lateFeePercent: "5.00",
        notes: "First-floor unit",
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        organizationId: organizationIds[0].id,
        propertyId: propertyIds[1].id,
        unitId: unitIds[3].id,
        tenantUserId: userIds[6].id,
        status: "active",
        startDate: new Date(now.getFullYear(), now.getMonth() - 2, 1),
        endDate: new Date(now.getFullYear() + 1, now.getMonth() - 2, 1),
        rentAmount: "48000.00",
        depositAmount: "96000.00",
        dueDayOfMonth: 1,
        billingCurrency: "KES",
        lateFeePercent: "5.00",
        notes: "Kilimani location",
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        organizationId: organizationIds[1].id,
        propertyId: propertyIds[2].id,
        unitId: unitIds[5].id,
        tenantUserId: userIds[7].id,
        status: "active",
        startDate: new Date(now.getFullYear(), now.getMonth() - 4, 10),
        endDate: new Date(now.getFullYear() + 1, now.getMonth() - 4, 10),
        rentAmount: "55000.00",
        depositAmount: "110000.00",
        dueDayOfMonth: 10,
        billingCurrency: "KES",
        lateFeePercent: "5.00",
        notes: "Beachfront property",
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        organizationId: organizationIds[1].id,
        propertyId: propertyIds[2].id,
        unitId: unitIds[6].id,
        tenantUserId: userIds[8].id,
        status: "active",
        startDate: new Date(now.getFullYear(), now.getMonth() - 6, 20),
        endDate: new Date(now.getFullYear() + 1, now.getMonth() - 6, 20),
        rentAmount: "75000.00",
        depositAmount: "150000.00",
        dueDayOfMonth: 20,
        billingCurrency: "KES",
        lateFeePercent: "5.00",
        notes: "Premium ocean view",
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ])
    .returning({ id: leases.id });

  // 11. Invoices - 10 entries (2 per lease for current and previous month)
  const invoiceIds = await db
    .insert(invoices)
    .values([
      // Lease 1 - Current month
      {
        organizationId: organizationIds[0].id,
        leaseId: leaseIds[0].id,
        invoiceNumber: `INV-${now.getFullYear()}${(now.getMonth() + 1)
          .toString()
          .padStart(2, "0")}-001`,
        status: "issued",
        issueDate: new Date(now.getFullYear(), now.getMonth(), 1),
        dueDate: new Date(now.getFullYear(), now.getMonth(), 5),
        currency: "KES",
        subtotalAmount: "45000.00",
        taxAmount: "0.00",
        totalAmount: "45000.00",
        balanceAmount: "45000.00",
        notes: "Monthly rent",
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      // Lease 1 - Previous month
      {
        organizationId: organizationIds[0].id,
        leaseId: leaseIds[0].id,
        invoiceNumber: `INV-${now.getFullYear()}${now
          .getMonth()
          .toString()
          .padStart(2, "0")}-001`,
        status: "paid",
        issueDate: new Date(now.getFullYear(), now.getMonth() - 1, 1),
        dueDate: new Date(now.getFullYear(), now.getMonth() - 1, 5),
        currency: "KES",
        subtotalAmount: "45000.00",
        taxAmount: "0.00",
        totalAmount: "45000.00",
        balanceAmount: "0.00",
        notes: "Monthly rent",
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      // Lease 2 - Current month
      {
        organizationId: organizationIds[0].id,
        leaseId: leaseIds[1].id,
        invoiceNumber: `INV-${now.getFullYear()}${(now.getMonth() + 1)
          .toString()
          .padStart(2, "0")}-002`,
        status: "issued",
        issueDate: new Date(now.getFullYear(), now.getMonth(), 1),
        dueDate: new Date(now.getFullYear(), now.getMonth(), 15),
        currency: "KES",
        subtotalAmount: "32000.00",
        taxAmount: "0.00",
        totalAmount: "32000.00",
        balanceAmount: "32000.00",
        notes: "Monthly rent",
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      // Lease 2 - Previous month
      {
        organizationId: organizationIds[0].id,
        leaseId: leaseIds[1].id,
        invoiceNumber: `INV-${now.getFullYear()}${now
          .getMonth()
          .toString()
          .padStart(2, "0")}-002`,
        status: "paid",
        issueDate: new Date(now.getFullYear(), now.getMonth() - 1, 1),
        dueDate: new Date(now.getFullYear(), now.getMonth() - 1, 15),
        currency: "KES",
        subtotalAmount: "32000.00",
        taxAmount: "0.00",
        totalAmount: "32000.00",
        balanceAmount: "0.00",
        notes: "Monthly rent",
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      // Lease 3 - Current month
      {
        organizationId: organizationIds[0].id,
        leaseId: leaseIds[2].id,
        invoiceNumber: `INV-${now.getFullYear()}${(now.getMonth() + 1)
          .toString()
          .padStart(2, "0")}-003`,
        status: "issued",
        issueDate: new Date(now.getFullYear(), now.getMonth(), 1),
        dueDate: new Date(now.getFullYear(), now.getMonth(), 1),
        currency: "KES",
        subtotalAmount: "48000.00",
        taxAmount: "0.00",
        totalAmount: "48000.00",
        balanceAmount: "48000.00",
        notes: "Monthly rent",
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      // Lease 3 - Previous month
      {
        organizationId: organizationIds[0].id,
        leaseId: leaseIds[2].id,
        invoiceNumber: `INV-${now.getFullYear()}${now
          .getMonth()
          .toString()
          .padStart(2, "0")}-003`,
        status: "paid",
        issueDate: new Date(now.getFullYear(), now.getMonth() - 1, 1),
        dueDate: new Date(now.getFullYear(), now.getMonth() - 1, 1),
        currency: "KES",
        subtotalAmount: "48000.00",
        taxAmount: "0.00",
        totalAmount: "48000.00",
        balanceAmount: "0.00",
        notes: "Monthly rent",
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      // Lease 4 - Current month
      {
        organizationId: organizationIds[1].id,
        leaseId: leaseIds[3].id,
        invoiceNumber: `INV-${now.getFullYear()}${(now.getMonth() + 1)
          .toString()
          .padStart(2, "0")}-004`,
        status: "issued",
        issueDate: new Date(now.getFullYear(), now.getMonth(), 1),
        dueDate: new Date(now.getFullYear(), now.getMonth(), 10),
        currency: "KES",
        subtotalAmount: "55000.00",
        taxAmount: "0.00",
        totalAmount: "55000.00",
        balanceAmount: "55000.00",
        notes: "Monthly rent",
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      // Lease 4 - Previous month
      {
        organizationId: organizationIds[1].id,
        leaseId: leaseIds[3].id,
        invoiceNumber: `INV-${now.getFullYear()}${now
          .getMonth()
          .toString()
          .padStart(2, "0")}-004`,
        status: "paid",
        issueDate: new Date(now.getFullYear(), now.getMonth() - 1, 1),
        dueDate: new Date(now.getFullYear(), now.getMonth() - 1, 10),
        currency: "KES",
        subtotalAmount: "55000.00",
        taxAmount: "0.00",
        totalAmount: "55000.00",
        balanceAmount: "0.00",
        notes: "Monthly rent",
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      // Lease 5 - Current month
      {
        organizationId: organizationIds[1].id,
        leaseId: leaseIds[4].id,
        invoiceNumber: `INV-${now.getFullYear()}${(now.getMonth() + 1)
          .toString()
          .padStart(2, "0")}-005`,
        status: "issued",
        issueDate: new Date(now.getFullYear(), now.getMonth(), 1),
        dueDate: new Date(now.getFullYear(), now.getMonth(), 20),
        currency: "KES",
        subtotalAmount: "75000.00",
        taxAmount: "0.00",
        totalAmount: "75000.00",
        balanceAmount: "75000.00",
        notes: "Monthly rent",
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      // Lease 5 - Previous month
      {
        organizationId: organizationIds[1].id,
        leaseId: leaseIds[4].id,
        invoiceNumber: `INV-${now.getFullYear()}${now
          .getMonth()
          .toString()
          .padStart(2, "0")}-005`,
        status: "paid",
        issueDate: new Date(now.getFullYear(), now.getMonth() - 1, 1),
        dueDate: new Date(now.getFullYear(), now.getMonth() - 1, 20),
        currency: "KES",
        subtotalAmount: "75000.00",
        taxAmount: "0.00",
        totalAmount: "75000.00",
        balanceAmount: "0.00",
        notes: "Monthly rent",
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ])
    .returning({ id: invoices.id });

  // 12. Invoice Items - 1-2 items per invoice
  await db.insert(invoiceItems).values([
    // Rent items
    {
      invoiceId: invoiceIds[0].id,
      description: "Monthly Rent",
      quantity: "1",
      unitPrice: "45000.00",
      lineTotal: "45000.00",
    },
    {
      invoiceId: invoiceIds[1].id,
      description: "Monthly Rent",
      quantity: "1",
      unitPrice: "45000.00",
      lineTotal: "45000.00",
    },
    {
      invoiceId: invoiceIds[2].id,
      description: "Monthly Rent",
      quantity: "1",
      unitPrice: "32000.00",
      lineTotal: "32000.00",
    },
    {
      invoiceId: invoiceIds[3].id,
      description: "Monthly Rent",
      quantity: "1",
      unitPrice: "32000.00",
      lineTotal: "32000.00",
    },
    {
      invoiceId: invoiceIds[4].id,
      description: "Monthly Rent",
      quantity: "1",
      unitPrice: "48000.00",
      lineTotal: "48000.00",
    },
    {
      invoiceId: invoiceIds[5].id,
      description: "Monthly Rent",
      quantity: "1",
      unitPrice: "48000.00",
      lineTotal: "48000.00",
    },
    {
      invoiceId: invoiceIds[6].id,
      description: "Monthly Rent",
      quantity: "1",
      unitPrice: "55000.00",
      lineTotal: "55000.00",
    },
    {
      invoiceId: invoiceIds[7].id,
      description: "Monthly Rent",
      quantity: "1",
      unitPrice: "55000.00",
      lineTotal: "55000.00",
    },
    {
      invoiceId: invoiceIds[8].id,
      description: "Monthly Rent",
      quantity: "1",
      unitPrice: "75000.00",
      lineTotal: "75000.00",
    },
    {
      invoiceId: invoiceIds[9].id,
      description: "Monthly Rent",
      quantity: "1",
      unitPrice: "75000.00",
      lineTotal: "75000.00",
    },

    // Additional charges for some invoices
    {
      invoiceId: invoiceIds[0].id,
      description: "Water Bill",
      quantity: "1",
      unitPrice: "1200.00",
      lineTotal: "1200.00",
    },
    {
      invoiceId: invoiceIds[2].id,
      description: "Maintenance Fee",
      quantity: "1",
      unitPrice: "1000.00",
      lineTotal: "1000.00",
    },
    {
      invoiceId: invoiceIds[6].id,
      description: "Internet Service",
      quantity: "1",
      unitPrice: "2500.00",
      lineTotal: "2500.00",
    },
    {
      invoiceId: invoiceIds[8].id,
      description: "Parking Fee",
      quantity: "1",
      unitPrice: "3000.00",
      lineTotal: "3000.00",
    },
  ]);

  // 13. Payments - 5 entries (for previous month invoices)
  const paymentIds = await db
    .insert(payments)
    .values([
      {
        organizationId: organizationIds[0].id,
        leaseId: leaseIds[0].id,
        receivedFromUserId: userIds[4].id,
        receivedByUserId: userIds[2].id,
        method: "mpesa",
        status: "completed",
        amount: "45000.00",
        currency: "KES",
        referenceCode: "MPE123456789",
        narrative: "Rent payment for previous month",
        receivedAt: new Date(now.getFullYear(), now.getMonth() - 1, 3),
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        organizationId: organizationIds[0].id,
        leaseId: leaseIds[1].id,
        receivedFromUserId: userIds[5].id,
        receivedByUserId: userIds[2].id,
        method: "mpesa",
        status: "completed",
        amount: "32000.00",
        currency: "KES",
        referenceCode: "MPE987654321",
        narrative: "Rent payment for previous month",
        receivedAt: new Date(now.getFullYear(), now.getMonth() - 1, 10),
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        organizationId: organizationIds[0].id,
        leaseId: leaseIds[2].id,
        receivedFromUserId: userIds[6].id,
        receivedByUserId: userIds[2].id,
        method: "bankTransfer",
        status: "completed",
        amount: "48000.00",
        currency: "KES",
        referenceCode: "BT2023001",
        narrative: "Rent payment for previous month",
        receivedAt: new Date(now.getFullYear(), now.getMonth() - 1, 1),
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        organizationId: organizationIds[1].id,
        leaseId: leaseIds[3].id,
        receivedFromUserId: userIds[7].id,
        receivedByUserId: userIds[2].id,
        method: "mpesa",
        status: "completed",
        amount: "55000.00",
        currency: "KES",
        referenceCode: "MPE555555555",
        narrative: "Rent payment for previous month",
        receivedAt: new Date(now.getFullYear(), now.getMonth() - 1, 5),
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        organizationId: organizationIds[1].id,
        leaseId: leaseIds[4].id,
        receivedFromUserId: userIds[8].id,
        receivedByUserId: userIds[2].id,
        method: "cash",
        status: "completed",
        amount: "75000.00",
        currency: "KES",
        narrative: "Rent payment for previous month",
        receivedAt: new Date(now.getFullYear(), now.getMonth() - 1, 15),
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ])
    .returning({ id: payments.id });

  // 14. Payment Allocations - link payments to invoices
  await db.insert(paymentAllocations).values([
    {
      paymentId: paymentIds[0].id,
      invoiceId: invoiceIds[1].id,
      amountApplied: "45000.00",
      createdAt: new Date(),
    },
    {
      paymentId: paymentIds[1].id,
      invoiceId: invoiceIds[3].id,
      amountApplied: "32000.00",
      createdAt: new Date(),
    },
    {
      paymentId: paymentIds[2].id,
      invoiceId: invoiceIds[5].id,
      amountApplied: "48000.00",
      createdAt: new Date(),
    },
    {
      paymentId: paymentIds[3].id,
      invoiceId: invoiceIds[7].id,
      amountApplied: "55000.00",
      createdAt: new Date(),
    },
    {
      paymentId: paymentIds[4].id,
      invoiceId: invoiceIds[9].id,
      amountApplied: "75000.00",
      createdAt: new Date(),
    },
  ]);

  // 15. Receipts - 5 entries (one for each payment)
  await db.insert(receipts).values([
    {
      organizationId: organizationIds[0].id,
      paymentId: paymentIds[0].id,
      receiptNumber: `RCPT-${now.getFullYear()}${now
        .getMonth()
        .toString()
        .padStart(2, "0")}-001`,
      issuedAt: new Date(now.getFullYear(), now.getMonth() - 1, 3),
      createdAt: new Date(),
    },
    {
      organizationId: organizationIds[0].id,
      paymentId: paymentIds[1].id,
      receiptNumber: `RCPT-${now.getFullYear()}${now
        .getMonth()
        .toString()
        .padStart(2, "0")}-002`,
      issuedAt: new Date(now.getFullYear(), now.getMonth() - 1, 10),
      createdAt: new Date(),
    },
    {
      organizationId: organizationIds[0].id,
      paymentId: paymentIds[2].id,
      receiptNumber: `RCPT-${now.getFullYear()}${now
        .getMonth()
        .toString()
        .padStart(2, "0")}-003`,
      issuedAt: new Date(now.getFullYear(), now.getMonth() - 1, 1),
      createdAt: new Date(),
    },
    {
      organizationId: organizationIds[1].id,
      paymentId: paymentIds[3].id,
      receiptNumber: `RCPT-${now.getFullYear()}${now
        .getMonth()
        .toString()
        .padStart(2, "0")}-004`,
      issuedAt: new Date(now.getFullYear(), now.getMonth() - 1, 5),
      createdAt: new Date(),
    },
    {
      organizationId: organizationIds[1].id,
      paymentId: paymentIds[4].id,
      receiptNumber: `RCPT-${now.getFullYear()}${now
        .getMonth()
        .toString()
        .padStart(2, "0")}-005`,
      issuedAt: new Date(now.getFullYear(), now.getMonth() - 1, 15),
      createdAt: new Date(),
    },
  ]);

  // 16. Maintenance Requests - 4 entries
  const maintenanceRequestIds = await db
    .insert(maintenanceRequests)
    .values([
      {
        organizationId: organizationIds[0].id,
        propertyId: propertyIds[0].id,
        unitId: unitIds[0].id,
        createdByUserId: userIds[4].id, // Changed from submittedByUserId
        assignedToUserId: userIds[9].id,
        title: "Leaking faucet in kitchen",
        description:
          "The kitchen faucet has been leaking for the past few days. It's wasting water and needs to be fixed.",
        priority: "medium",
        status: "inProgress", // Fixed enum value
        costAmount: "0.00", // Added required field
        createdAt: new Date(now.getFullYear(), now.getMonth(), 5),
        updatedAt: new Date(now.getFullYear(), now.getMonth(), 6),
      },
      {
        organizationId: organizationIds[0].id,
        propertyId: propertyIds[0].id,
        unitId: unitIds[1].id,
        createdByUserId: userIds[5].id, // Changed from submittedByUserId
        assignedToUserId: userIds[9].id,
        title: "AC not cooling properly",
        description:
          "The air conditioning unit is running but not cooling the room effectively.",
        priority: "high",
        status: "open",
        costAmount: "0.00", // Added required field
        createdAt: new Date(now.getFullYear(), now.getMonth(), 8),
        updatedAt: new Date(now.getFullYear(), now.getMonth(), 8),
      },
      {
        organizationId: organizationIds[0].id,
        propertyId: propertyIds[1].id,
        unitId: unitIds[3].id,
        createdByUserId: userIds[6].id, // Changed from submittedByUserId
        assignedToUserId: userIds[10].id,
        title: "Broken window latch",
        description:
          "The latch on the bedroom window is broken, making it difficult to secure the window properly.",
        priority: "low",
        status: "resolved", // Fixed enum value
        resolvedAt: new Date(now.getFullYear(), now.getMonth(), 12),
        costAmount: "0.00", // Added required field
        createdAt: new Date(now.getFullYear(), now.getMonth(), 10),
        updatedAt: new Date(now.getFullYear(), now.getMonth(), 12),
      },
      {
        organizationId: organizationIds[1].id,
        propertyId: propertyIds[2].id,
        unitId: unitIds[5].id,
        createdByUserId: userIds[7].id, // Changed from submittedByUserId
        assignedToUserId: userIds[10].id,
        title: "Blocked bathroom drain",
        description:
          "The bathroom sink drain is blocked and water is draining very slowly.",
        priority: "medium",
        status: "onHold", // Fixed enum value
        scheduledAt: new Date(now.getFullYear(), now.getMonth() + 1, 5),
        costAmount: "0.00", // Added required field
        createdAt: new Date(now.getFullYear(), now.getMonth(), 15),
        updatedAt: new Date(now.getFullYear(), now.getMonth(), 16),
      },
    ])
    .returning({ id: maintenanceRequests.id });

  // 17. Maintenance Comments - 2-3 comments per request
  await db.insert(maintenanceComments).values([
    {
      maintenanceRequestId: maintenanceRequestIds[0].id,
      authorUserId: userIds[4].id, // Changed from userId
      body: "I've placed a bucket under the leak for now to catch the water.", // Changed from comment
      createdAt: new Date(now.getFullYear(), now.getMonth(), 5, 10, 30),
    },
    {
      maintenanceRequestId: maintenanceRequestIds[0].id,
      authorUserId: userIds[9].id, // Changed from userId
      body: "I'll come by tomorrow afternoon to take a look at the faucet.", // Changed from comment
      createdAt: new Date(now.getFullYear(), now.getMonth(), 5, 16, 15),
    },
    {
      maintenanceRequestId: maintenanceRequestIds[1].id,
      authorUserId: userIds[5].id, // Changed from userId
      body: "This is becoming urgent as the temperatures are rising.", // Changed from comment
      createdAt: new Date(now.getFullYear(), now.getMonth(), 9, 9, 0),
    },
    {
      maintenanceRequestId: maintenanceRequestIds[2].id,
      authorUserId: userIds[6].id, // Changed from userId
      body: "The window is in the second bedroom.", // Changed from comment
      createdAt: new Date(now.getFullYear(), now.getMonth(), 10, 14, 20),
    },
    {
      maintenanceRequestId: maintenanceRequestIds[2].id,
      authorUserId: userIds[10].id, // Changed from userId
      body: "I've ordered the replacement part. Should arrive in 2 days.", // Changed from comment
      createdAt: new Date(now.getFullYear(), now.getMonth(), 10, 16, 45),
    },
    {
      maintenanceRequestId: maintenanceRequestIds[2].id,
      authorUserId: userIds[10].id, // Changed from userId
      body: "Fixed the latch today. Please confirm it's working properly.", // Changed from comment
      createdAt: new Date(now.getFullYear(), now.getMonth(), 12, 11, 30),
    },
    {
      maintenanceRequestId: maintenanceRequestIds[3].id,
      authorUserId: userIds[7].id, // Changed from userId
      body: "I tried using a plunger but it didn't help much.", // Changed from comment
      createdAt: new Date(now.getFullYear(), now.getMonth(), 15, 17, 0),
    },
  ]);

  // 18. Maintenance Attachments - 1-2 attachments per request
  await db.insert(maintenanceAttachments).values([
    {
      maintenanceRequestId: maintenanceRequestIds[0].id,
      fileName: "leaking_faucet.jpg",
      fileUrl: "https://example.com/attachments/leaking_faucet.jpg",
      contentType: "image/jpeg", // Changed from fileType
      sizeBytes: 102400, // Added required field
      createdAt: new Date(now.getFullYear(), now.getMonth(), 5, 10, 35),
    },
    {
      maintenanceRequestId: maintenanceRequestIds[1].id,
      fileName: "ac_unit.mp4",
      fileUrl: "https://example.com/attachments/ac_unit.mp4",
      contentType: "video/mp4", // Changed from fileType
      sizeBytes: 5120000, // Added required field
      createdAt: new Date(now.getFullYear(), now.getMonth(), 8, 15, 20),
    },
    {
      maintenanceRequestId: maintenanceRequestIds[2].id,
      fileName: "broken_latch.jpg",
      fileUrl: "https://example.com/attachments/broken_latch.jpg",
      contentType: "image/jpeg", // Changed from fileType
      sizeBytes: 204800, // Added required field
      createdAt: new Date(now.getFullYear(), now.getMonth(), 10, 14, 25),
    },
    {
      maintenanceRequestId: maintenanceRequestIds[3].id,
      fileName: "blocked_drain.jpg",
      fileUrl: "https://example.com/attachments/blocked_drain.jpg",
      contentType: "image/jpeg", // Changed from fileType
      sizeBytes: 153600, // Added required field
      createdAt: new Date(now.getFullYear(), now.getMonth(), 15, 17, 5),
    },
  ]);

  // 19. Activity Logs - 10 entries for various activities
  await db.insert(activityLogs).values([
    {
      organizationId: organizationIds[0].id,
      actorUserId: userIds[2].id, // Changed from userId
      action: "create", // Fixed enum value
      targetTable: "leases", // Changed from resourceType
      targetId: leaseIds[0].id, // Changed from resourceId
      description: "Created new lease for unit A-101", // Changed from details
      ipAddress: "192.168.1.100",
      userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
      createdAt: new Date(now.getFullYear(), now.getMonth() - 3, 1, 9, 0),
    },
    {
      organizationId: organizationIds[0].id,
      actorUserId: userIds[4].id, // Changed from userId
      action: "create", // Fixed enum value
      targetTable: "maintenanceRequests", // Changed from resourceType
      targetId: maintenanceRequestIds[0].id, // Changed from resourceId
      description: "Submitted maintenance request for leaking faucet", // Changed from details
      ipAddress: "192.168.1.101",
      userAgent:
        "Mozilla/5.0 (iPhone; CPU iPhone OS 14_0 like Mac OS X) AppleWebKit/605.1.15",
      createdAt: new Date(now.getFullYear(), now.getMonth(), 5, 10, 30),
    },
    {
      organizationId: organizationIds[0].id,
      actorUserId: userIds[2].id, // Changed from userId
      action: "create", // Fixed enum value
      targetTable: "invoices", // Changed from resourceType
      targetId: invoiceIds[0].id, // Changed from resourceId
      description: "Generated invoice for current month rent", // Changed from details
      ipAddress: "192.168.1.100",
      userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
      createdAt: new Date(now.getFullYear(), now.getMonth(), 1, 8, 0),
    },
    {
      organizationId: organizationIds[0].id,
      actorUserId: userIds[4].id, // Changed from userId
      action: "payment", // Fixed enum value
      targetTable: "payments", // Changed from resourceType
      targetId: paymentIds[0].id, // Changed from resourceId
      description: "Made payment via M-Pesa for previous month rent", // Changed from details
      ipAddress: "192.168.1.101",
      userAgent:
        "Mozilla/5.0 (iPhone; CPU iPhone OS 14.0 like Mac OS X) AppleWebKit/605.1.15",
      createdAt: new Date(now.getFullYear(), now.getMonth() - 1, 3, 14, 30),
    },
    {
      organizationId: organizationIds[1].id,
      actorUserId: userIds[2].id, // Changed from userId
      action: "create", // Fixed enum value
      targetTable: "properties", // Changed from resourceType
      targetId: propertyIds[2].id, // Changed from resourceId
      description: "Added new property: Nyali Beach Residences", // Changed from details
      ipAddress: "192.168.1.100",
      userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
      createdAt: new Date(now.getFullYear(), now.getMonth() - 6, 15, 10, 0),
    },
    {
      organizationId: organizationIds[0].id,
      actorUserId: userIds[9].id, // Changed from userId
      action: "assign", // Fixed enum value
      targetTable: "maintenanceRequests", // Changed from resourceType
      targetId: maintenanceRequestIds[0].id, // Changed from resourceId
      description: "Assigned to fix leaking faucet", // Changed from details
      ipAddress: "192.168.1.102",
      userAgent:
        "Mozilla/5.0 (Android 10; Mobile; rv:68.0) Gecko/68.0 Firefox/68.0",
      createdAt: new Date(now.getFullYear(), now.getMonth(), 5, 16, 15),
    },
    {
      organizationId: organizationIds[0].id,
      actorUserId: userIds[10].id, // Changed from userId
      action: "statusChange", // Fixed enum value
      targetTable: "maintenanceRequests", // Changed from resourceType
      targetId: maintenanceRequestIds[2].id, // Changed from resourceId
      description: "Completed window latch repair", // Changed from details
      ipAddress: "192.168.1.103",
      userAgent:
        "Mozilla/5.0 (Android 10; Mobile; rv:68.0) Gecko/68.0 Firefox/68.0",
      createdAt: new Date(now.getFullYear(), now.getMonth(), 12, 11, 30),
    },
    {
      organizationId: organizationIds[0].id,
      actorUserId: userIds[2].id, // Changed from userId
      action: "create", // Fixed enum value
      targetTable: "users", // Changed from resourceType
      targetId: userIds[3].id, // Changed from resourceId
      description: "Invited caretaker to join organization", // Changed from details
      ipAddress: "192.168.1.100",
      userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
      createdAt: new Date(now.getFullYear(), now.getMonth() - 4, 20, 11, 0),
    },
    {
      organizationId: organizationIds[1].id,
      actorUserId: userIds[7].id, // Changed from userId
      action: "create", // Fixed enum value
      targetTable: "leases", // Changed from resourceType
      targetId: leaseIds[3].id, // Changed from resourceId
      description: "Signed lease agreement for NB-101", // Changed from details
      ipAddress: "192.168.1.104",
      userAgent:
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36",
      createdAt: new Date(now.getFullYear(), now.getMonth() - 4, 10, 15, 30),
    },
    {
      organizationId: organizationIds[0].id,
      actorUserId: userIds[2].id, // Changed from userId
      action: "update", // Fixed enum value
      targetTable: "units", // Changed from resourceType
      targetId: unitIds[2].id, // Changed from resourceId
      description: "Updated unit B-201 status to vacant", // Changed from details
      ipAddress: "192.168.1.100",
      userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
      createdAt: new Date(now.getFullYear(), now.getMonth() - 1, 28, 16, 45),
    },
  ]);

  console.log("✅ Seeding completed!");
}

seed()
  .catch((e) => {
    console.error("❌ Seeding failed!");
    console.error(e);
    process.exit(1);
  })
  .finally(() => {
    process.exit(0);
  });
