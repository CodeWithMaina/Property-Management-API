// server.ts (updated section)
import express, { Request, Response } from "express";
import dotenv from "dotenv";
import cors from "cors";
import { propertyRouter } from "./property/property.route";
import { userRouter } from "./user/user.route";
import {organizationRouter} from "./organization/organization.route";
import leaseRouter from "./lease/lease.route";
import amenitiesRouter from "./amenity/amenity.route";
import invoiceRoutes from "./invoice/invoice.route";
import { errorHandler, notFoundHandler } from "./utils/errorHandler";
import {propertyManagerRouter} from "./propertyManager/propertyManager.route";
import { userOrganizationRouter } from "./userOrganization/userOrganization.route";
import unitAnalyticsRouter from "./unit/unitAnalytics.route";
import authRouter from "./auth/auth.route";
import unitRouter from "./unit/unit.route";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// CORS - should be first
app.use(
  cors({
    origin: ["http://localhost:5173"],
    methods: ["GET", "POST", "PUT", "DELETE"],
    allowedHeaders: ["Content-Type", "Authorization"],
    credentials: true,
  })
);

// Body Parsers
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// API Routes - use enhanced auth routes
app.use('/api/auth', authRouter) // Changed from authRouter to authEnhancedRouter
app.use('/api', propertyRouter)
app.use('/api', propertyManagerRouter)
app.use('/api', leaseRouter)
app.use('/api', amenitiesRouter)
app.use('/api', userRouter)
app.use('/api', unitAnalyticsRouter)
app.use('/api', organizationRouter)
app.use('/api', userOrganizationRouter)
app.use('/api', invoiceRoutes)
app.use('/api', unitRouter)

// Health check route
app.get("/", (req: Request, res: Response) => {
  res.send("✅ Property Management Backend is running.");
});

// 404 handler should be AFTER all routes
app.use(notFoundHandler);

// Error handler should be the VERY LAST middleware
app.use(errorHandler); 

// Start Server
app.listen(PORT, () => {
  console.log(`🚀 Server running at http://localhost:${PORT}`);
});