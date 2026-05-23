import express from 'express';
import {applyLeave, viewMyLeaves, viewOptOuts, viewFines, viewBills, uploadDocs, fileComplaint, viewComplaints, markComplaintResolved, viewMyRefund, fillResidentProfile, getResidentProfile, upsertResidence, registerMealOptOut, getNotices, getDocuments, markAttendance, getMyAttendance, uploadReferenceFaceImage} from '../controllers/residentControllers.js';
import { checkResidentLocation, getResidentGeofenceStatus } from '../controllers/geofenceControllers.js';
import { auth } from '../middlewares/auth.js';

import { attachResidentProfile } from '../middlewares/attachResidentProfile.js';
import { attachAcademicInfo } from '../middlewares/attachAcademicInfo.js';

const residentRouter = express.Router()
residentRouter.post('/leave', auth, attachResidentProfile, attachAcademicInfo, applyLeave);
residentRouter.get('/leaves', auth, attachResidentProfile, attachAcademicInfo, viewMyLeaves);
// Use POST so controllers read semester from req.body only
residentRouter.post('/fines', auth, attachResidentProfile,  attachAcademicInfo, viewFines);
residentRouter.post('/refund', auth, attachResidentProfile,  attachAcademicInfo, viewMyRefund);
residentRouter.post('/bill', auth, attachResidentProfile,  attachAcademicInfo, viewBills);
// NOTE: wire multer for docs upload so controller receives req.file
import { upload } from '../config/multer.js';
residentRouter.post('/docs', auth, attachResidentProfile, attachAcademicInfo, upload.single("docFile"), uploadDocs);
residentRouter.post('/filecomplaint', auth, attachResidentProfile,  attachAcademicInfo, fileComplaint);
// Keep POST for backward-compatibility
residentRouter.post('/viewcomplaint', auth, attachResidentProfile,  attachAcademicInfo, viewComplaints);
// Add GET variant which matches controller's query expectations
residentRouter.get('/viewcomplaint', auth, attachResidentProfile, attachAcademicInfo, viewComplaints);
residentRouter.put('/resolvecomplaint/:id', auth, attachResidentProfile,  attachAcademicInfo, markComplaintResolved);
residentRouter.get('/profile', auth, attachResidentProfile, getResidentProfile);
residentRouter.post('/profile', auth, fillResidentProfile);
residentRouter.post('/profile/reference-face', auth, upload.single("referenceFaceImage"), uploadReferenceFaceImage);
residentRouter.get('/voptouts', auth, attachResidentProfile, attachAcademicInfo, viewOptOuts);
residentRouter.post('/aoptouts', auth, attachResidentProfile, attachAcademicInfo, registerMealOptOut)
residentRouter.put('/upsertResidence', auth, attachResidentProfile, attachAcademicInfo, upsertResidence);
residentRouter.get('/viewNotices', auth, attachResidentProfile, attachAcademicInfo, getNotices);
residentRouter.get('/viewDocs', auth, attachResidentProfile, attachAcademicInfo, getDocuments)
residentRouter.post('/attendance', auth, attachResidentProfile, attachAcademicInfo, upload.single("attendanceVideo"), markAttendance);
residentRouter.get('/attendance', auth, attachResidentProfile, attachAcademicInfo, getMyAttendance);
residentRouter.get('/attendance/geofence-status', auth, getResidentGeofenceStatus);
residentRouter.post('/attendance/check-location', auth, checkResidentLocation);
export default residentRouter;