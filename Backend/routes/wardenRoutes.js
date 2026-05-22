import express from 'express';
import {viewLeaves, calculateMessRefunds, approveLeave, rejectLeave, viewComplaints, issueNotice, viewResidents, listAttendance, updateAttendanceVerification, listMessExpenses, createMessExpense, updateMessExpense, deleteMessExpense} from '../controllers/wardenControllers.js'
import { getHostelGeofenceForWarden, upsertHostelGeofence } from '../controllers/geofenceControllers.js';
import { upload } from '../config/multer.js';
import { checkHostelAccess } from '../middlewares/checkRole.js';
import { auth } from '../middlewares/auth.js';
const wardenRouter = express.Router();

wardenRouter.get('/leaves', auth, checkHostelAccess, viewLeaves);
wardenRouter.get('/complaints', auth, checkHostelAccess, viewComplaints);
wardenRouter.get('/residents', auth, checkHostelAccess, viewResidents);
wardenRouter.patch('/approve/:id', auth, checkHostelAccess, approveLeave);
wardenRouter.patch('/reject/:id', auth, checkHostelAccess, rejectLeave);
wardenRouter.post('/notice', auth, checkHostelAccess, upload.single("noticeFile"), issueNotice);
wardenRouter.get("/mess-expenses", auth, checkHostelAccess, listMessExpenses);
wardenRouter.post("/mess-expenses", auth, checkHostelAccess, createMessExpense);
wardenRouter.patch("/mess-expenses/:id", auth, checkHostelAccess, updateMessExpense);
wardenRouter.delete("/mess-expenses/:id", auth, checkHostelAccess, deleteMessExpense);
wardenRouter.get("/mess-refunds", auth, checkHostelAccess, calculateMessRefunds);
wardenRouter.get("/attendance", auth, checkHostelAccess, listAttendance);
wardenRouter.patch("/attendance/:id", auth, checkHostelAccess, updateAttendanceVerification);
wardenRouter.get("/geofence", auth, checkHostelAccess, getHostelGeofenceForWarden);
wardenRouter.put("/geofence", auth, checkHostelAccess, upsertHostelGeofence);
export default wardenRouter;
