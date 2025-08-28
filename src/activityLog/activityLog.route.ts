import { Router } from "express";
import {
  createActivityLogHandler,
  getAllActivityLogsHandler,
  getOrganizationLogsHandler,
  getUserLogsHandler,
  getTargetLogsHandler,
  getActivityStatsHandler,
  createBatchActivityLogsHandler,
} from "./activityLog.controller";
import {
  NewActivityLogSchema,
  ActivityLogFilterSchema,
  OrgParamsSchema,
  UserParamsSchema,
  TargetParamsSchema,
  StatsQuerySchema,
  BatchActivityLogSchema,
} from "./activityLog.validator";
import { validate } from "../middleware/validate";
import z from "zod/v4";
import rateLimit from "express-rate-limit";

const router = Router();

/**
 * Activity Logs Routes with Validation Middleware
 */

// POST /activity-logs → Create new log
router.post(
  "/",
  validate(NewActivityLogSchema, "body"),
  createActivityLogHandler
);

// GET /activity-logs → List logs with filters
router.get(
  "/",
  validate(ActivityLogFilterSchema, "query"),
  getAllActivityLogsHandler
);

// GET /activity-logs/organization/:orgId
router.get(
  "/organization/:orgId",
  validate(OrgParamsSchema, "params"),
  getOrganizationLogsHandler
);

// GET /activity-logs/user/:userId
router.get(
  "/user/:userId",
  validate(UserParamsSchema, "params"),
  getUserLogsHandler
);

// GET /activity-logs/target/:table/:id
router.get(
  "/target/:table/:id",
  validate(TargetParamsSchema, "params"),
  getTargetLogsHandler
);

// GET /activity-logs/stats
router.get(
  "/stats",
  validate(StatsQuerySchema, "query"),
  getActivityStatsHandler
);



// Rate limiting
const createLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: "Too many activity log creation attempts"
});

const readLimiter = rateLimit({
  windowMs: 1 * 60 * 1000,
  max: 300,
  message: "Too many read requests"
});

// POST /activity-logs → Create new log
router.post(
  "/",
  createLimiter,
  validate(NewActivityLogSchema, "body"),
  createActivityLogHandler
);

// POST /activity-logs/batch → Batch create logs
router.post(
  "/batch",
  createLimiter,
  validate(BatchActivityLogSchema, "body"),
  createBatchActivityLogsHandler
);

// GET /activity-logs → List logs with filters
router.get(
  "/",
  readLimiter,
  validate(ActivityLogFilterSchema, "query"),
  getAllActivityLogsHandler
);

// GET /activity-logs/export → Export logs
// router.get(
//   "/export",
//   readLimiter,
//   validate(ActivityLogFilterSchema, "query"),
//   exportActivityLogsHandler
// );

export default router;


