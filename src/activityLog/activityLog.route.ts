import express from 'express';
import { fetchActivityLogs, fetchActivityStats, logActivity } from './activityLog.controller';

// import { authenticate } from '../middlewares/auth.middleware';

export const logActivityRouter = express.Router();

// Manual logging endpoint
logActivityRouter.post('/', logActivity);

// Log retrieval endpoints
logActivityRouter.get('/', fetchActivityLogs);
logActivityRouter.get('/stats', fetchActivityStats);



// // Get all user profile updates
// await getActivityLogs({
//   entityType: 'User',
//   action: 'UPDATE'
// });

// // Get failed login attempts last week
// await getActivityLogs({
//   action: 'LOGIN_FAILED',
//   startDate: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
// });

// // Get paginated results
// await getActivityLogs({
//   page: 2,
//   limit: 50
// });