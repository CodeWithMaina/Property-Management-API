import express, { Request, Response } from "express";
import dotenv from "dotenv";
import cors from "cors";
import { propertyRouter } from "./property/property.route";
import { unitRouter } from "./unit/unit.route";
import { paymentRouter } from "./payment/payment.route";
import { leaseRouter } from "./lease/lease.route";
import { unitAmenityRouter } from "./unitAmenity/unitAmenity.route";
import { propertyAmenityRouter } from "./propertyAmenity/propertyAmenity.route";
import { amenityRouter } from "./amenity/amenity.route";
import { subscriptionRouter } from "./subscription/subscription.route";
import { ticketRouter } from "./ticket/ticket.route";
import { userRouter } from "./user/user.route";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

app.get("/", (req: Request, res: Response) => {
  res.send("✅ Property Management Backend is running.");
});

// CORS
app.use(
  cors({
    origin: ["http://localhost:5173"],
    methods: ["GET", "POST", "PUT", "DELETE"],
    allowedHeaders: ["Content-Type", "Authorization"],
    credentials: true,
  })
);

// 🧾 Logging
// app.use(logger);

// 🔍 Body Parsers (for all other routes)
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// 📦 API Routes
app.use('/api', propertyRouter)
app.use('/api', unitRouter)
app.use('/api', paymentRouter)
app.use('/api', leaseRouter)
app.use('/api', unitAmenityRouter)
app.use('/api', propertyAmenityRouter)
app.use('/api', amenityRouter)
app.use('/api', subscriptionRouter)
app.use('/api', ticketRouter)
app.use('/api', userRouter)

// 🚀 Start Server
app.listen(PORT, () => {
  console.log(`🚀 Server running at http://localhost:${PORT}`);
});
