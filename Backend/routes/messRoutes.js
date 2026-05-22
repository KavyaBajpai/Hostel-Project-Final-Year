import express from 'express';
import {getOptOutCounts, uploadMessExpenseWithBill} from '../controllers/messControllers.js';
import { auth } from '../middlewares/auth.js';
import { upload } from '../config/multer.js';
import { checkHostelAccess, checkMessAccess } from '../middlewares/checkRole.js';
const messRouter = express.Router();

messRouter.post('/upload',
  auth,
  checkHostelAccess,
  upload.single("bill"), // name="bill" in form
  uploadMessExpenseWithBill);

messRouter.get('/count', auth, checkMessAccess, getOptOutCounts);

export default messRouter;