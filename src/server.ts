import express, { Request, Response } from "express";
import dotenv from "dotenv";
import cors from "cors";
import { propertyRouter } from "./property/property.route";
import { unitRouter } from "./unit/unit.route";
import { userRouter } from "./user/user.route";
import organizationRouter from "./organization/organization.route";
import leaseRouter from "./lease/lease.route";
import amenitiesRouter from "./amenity/amenity.route";
import invoiceRoutes from "./invoice/invoice.route";
import { errorHandler, notFoundHandler } from "./utils/errorHandler";

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

// 🔍 Body Parsers (for all other routes)
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// 📦 API Routes - should come after middleware but before error handlers
app.use('/api', propertyRouter)
app.use('/api', unitRouter)
app.use('/api', leaseRouter)
app.use('/api', amenitiesRouter)
app.use('/api', userRouter)
app.use('/api', organizationRouter)
app.use('/api', invoiceRoutes)

// Health check route
app.get("/", (req: Request, res: Response) => {
  res.send("✅ Property Management Backend is running.");
});

// 404 handler should be AFTER all routes
app.use(notFoundHandler);

// Error handler should be the VERY LAST middleware
app.use(errorHandler); 

// 🚀 Start Server
app.listen(PORT, () => {
  console.log(`🚀 Server running at http://localhost:${PORT}`);
});