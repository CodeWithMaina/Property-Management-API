import db from "./db";
import {
  users,
  properties,
  units,
  amenities,
  propertyAmenities,
  unitAmenities,
  leases,
  payments,
  tickets,
  billingPlans,
  subscriptions,
  activityLogs,
  userRoleEnum,
  paymentStatusEnum,
  ticketStatusEnum,
  billingIntervalEnum
} from "./schema";

async function seedDatabase() {
  console.log("Starting database seeding...");

  // Clear existing data
  console.log("Clearing existing data...");
  await db.delete(activityLogs).execute();
  await db.delete(subscriptions).execute();
  await db.delete(billingPlans).execute();
  await db.delete(tickets).execute();
  await db.delete(payments).execute();
  await db.delete(leases).execute();
  await db.delete(unitAmenities).execute();
  await db.delete(propertyAmenities).execute();
  await db.delete(amenities).execute();
  await db.delete(units).execute();
  await db.delete(properties).execute();
  await db.delete(users).execute();

  // =============================
  // USERS
  // =============================
  console.log("Seeding users...");
  const userData = [
    // Admins
    {
      name: "Admin Super",
      email: "superadmin@example.com",
      passwordHash: "$2a$10$examplehash",
      role: userRoleEnum.enumValues[5], // "super_admin"
      phone: "+254700000001"
    },
    {
      name: "Admin Regular",
      email: "admin@example.com",
      passwordHash: "$2a$10$examplehash",
      role: userRoleEnum.enumValues[4], // "admin"
      phone: "+254700000002"
    },
    
    // Property Owners
    {
      name: "John Properties",
      email: "john@properties.com",
      passwordHash: "$2a$10$examplehash",
      role: userRoleEnum.enumValues[1], // "property_owner"
      phone: "+254711111111"
    },
    {
      name: "Jane Estates",
      email: "jane@estates.com",
      passwordHash: "$2a$10$examplehash",
      role: userRoleEnum.enumValues[1], // "property_owner"
      phone: "+254722222222"
    },
    
    // Managers
    {
      name: "Mike Manager",
      email: "mike@management.com",
      passwordHash: "$2a$10$examplehash",
      role: userRoleEnum.enumValues[2], // "manager"
      phone: "+254733333333"
    },
    {
      name: "Sarah Supervisor",
      email: "sarah@management.com",
      passwordHash: "$2a$10$examplehash",
      role: userRoleEnum.enumValues[2], // "manager"
      phone: "+254744444444"
    },
    
    // Caretakers
    {
      name: "David Caretaker",
      email: "david@care.com",
      passwordHash: "$2a$10$examplehash",
      role: userRoleEnum.enumValues[3], // "caretaker"
      phone: "+254755555555"
    },
    {
      name: "Grace Groundskeeper",
      email: "grace@care.com",
      passwordHash: "$2a$10$examplehash",
      role: userRoleEnum.enumValues[3], // "caretaker"
      phone: "+254766666666"
    },
    
    // Tenants
    {
      name: "Alice Tenant",
      email: "alice@tenant.com",
      passwordHash: "$2a$10$examplehash",
      role: userRoleEnum.enumValues[0], // "tenant"
      phone: "+254777777777"
    },
    {
      name: "Bob Renter",
      email: "bob@tenant.com",
      passwordHash: "$2a$10$examplehash",
      role: userRoleEnum.enumValues[0], // "tenant"
      phone: "+254788888888"
    },
    {
      name: "Charlie Occupant",
      email: "charlie@tenant.com",
      passwordHash: "$2a$10$examplehash",
      role: userRoleEnum.enumValues[0], // "tenant"
      phone: "+254799999999"
    },
    {
      name: "Diana Resident",
      email: "diana@tenant.com",
      passwordHash: "$2a$10$examplehash",
      role: userRoleEnum.enumValues[0], // "tenant"
      phone: "+254710101010"
    }
  ];

  const insertedUsers = await db.insert(users).values(userData).returning();

  // Extract some users for relationships
  const [superAdmin, admin, johnOwner, janeOwner, mikeManager, sarahManager, 
         davidCaretaker, graceCaretaker, aliceTenant, bobTenant, charlieTenant, dianaTenant] = insertedUsers;

  // =============================
  // BILLING PLANS
  // =============================
  console.log("Seeding billing plans...");
  const planData = [
    {
      name: "Starter",
      price: "49.99",
      interval: billingIntervalEnum.enumValues[0], // "monthly"
      maxProperties: 5
    },
    {
      name: "Professional",
      price: "99.99",
      interval: billingIntervalEnum.enumValues[0], // "monthly"
      maxProperties: 20
    },
    {
      name: "Enterprise",
      price: "199.99",
      interval: billingIntervalEnum.enumValues[0], // "monthly"
      maxProperties: 100
    },
    {
      name: "Annual Starter",
      price: "499.99",
      interval: billingIntervalEnum.enumValues[2], // "yearly"
      maxProperties: 5
    }
  ];

  const insertedPlans = await db.insert(billingPlans).values(planData).returning();
  const [starterPlan, professionalPlan, enterprisePlan, annualStarterPlan] = insertedPlans;

  // =============================
  // SUBSCRIPTIONS
  // =============================
  console.log("Seeding subscriptions...");
  await db.insert(subscriptions).values([
    {
      userId: johnOwner.id,
      planId: professionalPlan.id,
      startDate: new Date("2023-01-01"),
      endDate: new Date("2024-01-01"),
      isActive: true
    },
    {
      userId: janeOwner.id,
      planId: enterprisePlan.id,
      startDate: new Date("2023-03-15"),
      endDate: new Date("2024-03-15"),
      isActive: true
    }
  ]);

  // =============================
  // PROPERTIES
  // =============================
  console.log("Seeding properties...");
  const propertyData = [
    {
      ownerId: johnOwner.id,
      managerId: mikeManager.id,
      name: "Green Valley Apartments",
      address: "123 Garden Road, Nairobi"
    },
    {
      ownerId: johnOwner.id,
      managerId: sarahManager.id,
      name: "Sunset Villas",
      address: "456 Beach Boulevard, Mombasa"
    },
    {
      ownerId: janeOwner.id,
      managerId: mikeManager.id,
      name: "Mountain View Estates",
      address: "789 Hillside Drive, Nakuru"
    },
    {
      ownerId: janeOwner.id,
      name: "Downtown Lofts",
      address: "321 Central Avenue, Nairobi"
    }
  ];

  const insertedProperties = await db.insert(properties).values(propertyData).returning();
  const [greenValley, sunsetVillas, mountainView, downtownLofts] = insertedProperties;

  // =============================
  // AMENITIES
  // =============================
  console.log("Seeding amenities...");
  const amenityData = [
    // Property amenities
    {
      name: "Swimming Pool",
      description: "Outdoor swimming pool for residents",
      icon: "pool",
      isPropertyAmenity: true,
      isUnitAmenity: false
    },
    {
      name: "Gym",
      description: "Fully equipped fitness center",
      icon: "fitness_center",
      isPropertyAmenity: true,
      isUnitAmenity: false
    },
    {
      name: "Parking",
      description: "Secure parking area",
      icon: "local_parking",
      isPropertyAmenity: true,
      isUnitAmenity: false
    },
    {
      name: "Security",
      description: "24/7 security with CCTV",
      icon: "security",
      isPropertyAmenity: true,
      isUnitAmenity: false
    },
    {
      name: "Playground",
      description: "Children's play area",
      icon: "child_friendly",
      isPropertyAmenity: true,
      isUnitAmenity: false
    },
    
    // Unit amenities
    {
      name: "Air Conditioning",
      description: "Central air conditioning system",
      icon: "ac_unit",
      isPropertyAmenity: false,
      isUnitAmenity: true
    },
    {
      name: "Balcony",
      description: "Private balcony with view",
      icon: "balcony",
      isPropertyAmenity: false,
      isUnitAmenity: true
    },
    {
      name: "Furnished",
      description: "Fully furnished unit",
      icon: "weekend",
      isPropertyAmenity: false,
      isUnitAmenity: true
    },
    {
      name: "WiFi",
      description: "High-speed internet included",
      icon: "wifi",
      isPropertyAmenity: false,
      isUnitAmenity: true
    },
    {
      name: "Dishwasher",
      description: "Built-in dishwasher",
      icon: "kitchen",
      isPropertyAmenity: false,
      isUnitAmenity: true
    },
    
    // Shared amenities
    {
      name: "Laundry",
      description: "Laundry facilities",
      icon: "local_laundry_service",
      isPropertyAmenity: true,
      isUnitAmenity: true
    },
    {
      name: "Garden",
      description: "Landscaped garden area",
      icon: "nature",
      isPropertyAmenity: true,
      isUnitAmenity: false
    }
  ];

  const insertedAmenities = await db.insert(amenities).values(amenityData).returning();
  const [
    swimmingPool, gym, parking, security, playground,
    airCon, balcony, furnished, wifi, dishwasher,
    laundry, garden
  ] = insertedAmenities;

  // =============================
  // PROPERTY AMENITIES
  // =============================
  console.log("Seeding property amenities...");
  await db.insert(propertyAmenities).values([
    { propertyId: greenValley.id, amenityId: swimmingPool.id },
    { propertyId: greenValley.id, amenityId: gym.id },
    { propertyId: greenValley.id, amenityId: parking.id },
    { propertyId: greenValley.id, amenityId: security.id },
    { propertyId: greenValley.id, amenityId: laundry.id },
    
    { propertyId: sunsetVillas.id, amenityId: swimmingPool.id },
    { propertyId: sunsetVillas.id, amenityId: parking.id },
    { propertyId: sunsetVillas.id, amenityId: security.id },
    { propertyId: sunsetVillas.id, amenityId: playground.id },
    { propertyId: sunsetVillas.id, amenityId: garden.id },
    
    { propertyId: mountainView.id, amenityId: gym.id },
    { propertyId: mountainView.id, amenityId: parking.id },
    { propertyId: mountainView.id, amenityId: security.id },
    { propertyId: mountainView.id, amenityId: laundry.id },
    
    { propertyId: downtownLofts.id, amenityId: gym.id },
    { propertyId: downtownLofts.id, amenityId: parking.id },
    { propertyId: downtownLofts.id, amenityId: security.id }
  ]);

  // =============================
  // UNITS
  // =============================
  console.log("Seeding units...");
  const unitData = [
    // Green Valley Apartments
    {
      propertyId: greenValley.id,
      name: "GV-101",
      type: "Studio",
      rentAmount: "35000.00",
      isOccupied: true
    },
    {
      propertyId: greenValley.id,
      name: "GV-102",
      type: "1 Bedroom",
      rentAmount: "45000.00",
      isOccupied: true
    },
    {
      propertyId: greenValley.id,
      name: "GV-201",
      type: "2 Bedroom",
      rentAmount: "60000.00",
      isOccupied: false
    },
    {
      propertyId: greenValley.id,
      name: "GV-202",
      type: "2 Bedroom",
      rentAmount: "62000.00",
      isOccupied: true
    },
    
    // Sunset Villas
    {
      propertyId: sunsetVillas.id,
      name: "SV-1",
      type: "3 Bedroom Villa",
      rentAmount: "120000.00",
      isOccupied: true
    },
    {
      propertyId: sunsetVillas.id,
      name: "SV-2",
      type: "2 Bedroom Villa",
      rentAmount: "90000.00",
      isOccupied: false
    },
    
    // Mountain View Estates
    {
      propertyId: mountainView.id,
      name: "MV-101",
      type: "1 Bedroom",
      rentAmount: "40000.00",
      isOccupied: true
    },
    {
      propertyId: mountainView.id,
      name: "MV-102",
      type: "1 Bedroom",
      rentAmount: "42000.00",
      isOccupied: true
    },
    {
      propertyId: mountainView.id,
      name: "MV-201",
      type: "2 Bedroom",
      rentAmount: "65000.00",
      isOccupied: true
    },
    
    // Downtown Lofts
    {
      propertyId: downtownLofts.id,
      name: "DL-501",
      type: "Penthouse",
      rentAmount: "150000.00",
      isOccupied: false
    },
    {
      propertyId: downtownLofts.id,
      name: "DL-401",
      type: "2 Bedroom Loft",
      rentAmount: "85000.00",
      isOccupied: true
    }
  ];

  const insertedUnits = await db.insert(units).values(unitData).returning();
  const [
    gv101, gv102, gv201, gv202,
    sv1, sv2,
    mv101, mv102, mv201,
    dl501, dl401
  ] = insertedUnits;

  // =============================
  // UNIT AMENITIES
  // =============================
  console.log("Seeding unit amenities...");
  await db.insert(unitAmenities).values([
    { unitId: gv101.id, amenityId: airCon.id },
    { unitId: gv101.id, amenityId: wifi.id },
    { unitId: gv101.id, amenityId: laundry.id },
    
    { unitId: gv102.id, amenityId: airCon.id },
    { unitId: gv102.id, amenityId: wifi.id },
    { unitId: gv102.id, amenityId: balcony.id },
    { unitId: gv102.id, amenityId: laundry.id },
    
    { unitId: gv201.id, amenityId: airCon.id },
    { unitId: gv201.id, amenityId: wifi.id },
    { unitId: gv201.id, amenityId: balcony.id },
    { unitId: gv201.id, amenityId: furnished.id },
    { unitId: gv201.id, amenityId: dishwasher.id },
    
    { unitId: sv1.id, amenityId: airCon.id },
    { unitId: sv1.id, amenityId: wifi.id },
    { unitId: sv1.id, amenityId: balcony.id },
    { unitId: sv1.id, amenityId: furnished.id },
    { unitId: sv1.id, amenityId: dishwasher.id },
    
    { unitId: mv101.id, amenityId: wifi.id },
    { unitId: mv101.id, amenityId: laundry.id },
    
    { unitId: dl501.id, amenityId: airCon.id },
    { unitId: dl501.id, amenityId: wifi.id },
    { unitId: dl501.id, amenityId: balcony.id },
    { unitId: dl501.id, amenityId: furnished.id },
    { unitId: dl501.id, amenityId: dishwasher.id }
  ]);

  // =============================
  // LEASES
  // =============================
  console.log("Seeding leases...");
  const leaseData = [
    {
      tenantId: aliceTenant.id,
      unitId: gv101.id,
      startDate: new Date("2023-01-01"),
      endDate: new Date("2024-01-01"),
      rentAmount: "35000.00",
      depositAmount: "70000.00"
    },
    {
      tenantId: bobTenant.id,
      unitId: gv102.id,
      startDate: new Date("2023-02-15"),
      endDate: new Date("2024-02-15"),
      rentAmount: "45000.00",
      depositAmount: "90000.00"
    },
    {
      tenantId: charlieTenant.id,
      unitId: sv1.id,
      startDate: new Date("2023-03-01"),
      endDate: new Date("2024-03-01"),
      rentAmount: "120000.00",
      depositAmount: "240000.00"
    },
    {
      tenantId: dianaTenant.id,
      unitId: mv101.id,
      startDate: new Date("2023-04-01"),
      endDate: new Date("2024-04-01"),
      rentAmount: "40000.00",
      depositAmount: "80000.00"
    },
    {
      tenantId: aliceTenant.id,
      unitId: dl401.id,
      startDate: new Date("2023-05-15"),
      endDate: new Date("2024-05-15"),
      rentAmount: "85000.00",
      depositAmount: "170000.00"
    }
  ];

  const insertedLeases = await db.insert(leases).values(leaseData).returning();
  const [lease1, lease2, lease3, lease4, lease5] = insertedLeases;

  // =============================
  // PAYMENTS
  // =============================
  console.log("Seeding payments...");
  await db.insert(payments).values([
    // Lease 1 payments
    {
      leaseId: lease1.id,
      amount: "35000.00",
      status: paymentStatusEnum.enumValues[1], // "completed"
      method: "M-Pesa",
      paidAt: new Date("2023-01-01")
    },
    {
      leaseId: lease1.id,
      amount: "35000.00",
      status: paymentStatusEnum.enumValues[1], // "completed"
      method: "M-Pesa",
      paidAt: new Date("2023-02-01")
    },
    {
      leaseId: lease1.id,
      amount: "35000.00",
      status: paymentStatusEnum.enumValues[0], // "pending"
      method: null,
      paidAt: null
    },
    
    // Lease 2 payments
    {
      leaseId: lease2.id,
      amount: "45000.00",
      status: paymentStatusEnum.enumValues[1], // "completed"
      method: "Bank Transfer",
      paidAt: new Date("2023-02-15")
    },
    {
      leaseId: lease2.id,
      amount: "45000.00",
      status: paymentStatusEnum.enumValues[1], // "completed"
      method: "Bank Transfer",
      paidAt: new Date("2023-03-15")
    },
    
    // Lease 3 payments
    {
      leaseId: lease3.id,
      amount: "120000.00",
      status: paymentStatusEnum.enumValues[1], // "completed"
      method: "Bank Transfer",
      paidAt: new Date("2023-03-01")
    },
    {
      leaseId: lease3.id,
      amount: "120000.00",
      status: paymentStatusEnum.enumValues[2], // "failed"
      method: "Bank Transfer",
      paidAt: null
    },
    
    // Lease 4 payments
    {
      leaseId: lease4.id,
      amount: "40000.00",
      status: paymentStatusEnum.enumValues[1], // "completed"
      method: "M-Pesa",
      paidAt: new Date("2023-04-01")
    }
  ]);

  // =============================
  // TICKETS
  // =============================
  console.log("Seeding tickets...");
  await db.insert(tickets).values([
    {
      createdById: aliceTenant.id,
      propertyId: greenValley.id,
      unitId: gv101.id,
      title: "Leaking faucet in kitchen",
      description: "The kitchen faucet has been leaking for 3 days now",
      status: ticketStatusEnum.enumValues[0] // "open"
    },
    {
      createdById: bobTenant.id,
      propertyId: greenValley.id,
      unitId: gv102.id,
      title: "AC not cooling properly",
      description: "The AC is making noise and not cooling as it should",
      status: ticketStatusEnum.enumValues[1] // "in_progress"
    },
    {
      createdById: charlieTenant.id,
      propertyId: sunsetVillas.id,
      unitId: sv1.id,
      title: "Broken gate at entrance",
      description: "The main gate is not closing properly",
      status: ticketStatusEnum.enumValues[2] // "resolved"
    },
    {
      createdById: dianaTenant.id,
      propertyId: mountainView.id,
      unitId: mv101.id,
      title: "Internet connection issues",
      description: "WiFi keeps disconnecting every few minutes",
      status: ticketStatusEnum.enumValues[0] // "open"
    },
    {
      createdById: aliceTenant.id,
      propertyId: downtownLofts.id,
      unitId: dl401.id,
      title: "Elevator not working",
      description: "Elevator has been stuck on 3rd floor for 2 days",
      status: ticketStatusEnum.enumValues[0] // "open"
    }
  ]);

  // =============================
  // ACTIVITY LOGS
  // =============================
  console.log("Seeding activity logs...");
  await db.insert(activityLogs).values([
    {
      userId: superAdmin.id,
      action: "System initialized",
      details: "Database setup completed"
    },
    {
      userId: johnOwner.id,
      action: "Property added",
      details: `Added property: ${greenValley.name}`
    },
    {
      userId: mikeManager.id,
      action: "Unit rented",
      details: `Unit ${gv101.name} rented to ${aliceTenant.name}`
    },
    {
      userId: sarahManager.id,
      action: "Maintenance request",
      details: "Assigned caretaker to fix AC in unit GV-102"
    },
    {
      userId: davidCaretaker.id,
      action: "Maintenance completed",
      details: "Fixed leaking faucet in unit GV-101"
    }
  ]);

  console.log("Database seeding completed successfully!");
}

seedDatabase()
  .then(() => {
    console.log("Seeding process finished");
    process.exit(0);
  })
  .catch((err) => {
    console.error("Error seeding database:", err);
    process.exit(1);
  });