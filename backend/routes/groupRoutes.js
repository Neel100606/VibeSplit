import express from 'express';
import { 
  getUserGroups,
  createGroup, 
  getGroupById, 
  getGroupSettlements,
  getGroupActivities,
  addGroupComment,
  addGroupMember,
  sendNudge,
  generatePdfReport
} from '../controllers/groupController.js';
import auth from '../middleware/auth.js';

const router = express.Router();

router.get('/', auth, getUserGroups);
router.post('/', auth, createGroup);
router.get('/:id', auth, getGroupById);
router.get('/:id/settlements', auth, getGroupSettlements);
router.get('/:id/activities', auth, getGroupActivities);
router.post('/:id/comments', auth, addGroupComment);
router.post('/:id/members', auth, addGroupMember);
router.post('/:id/remind', auth, sendNudge);
router.get('/:id/report/pdf', auth, generatePdfReport);

export default router;
