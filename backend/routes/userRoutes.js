import express from 'express';
import { signupUser, loginUser, googleAuth, getUserProfile, updateProfile, addFriend, getFriends, verifyEmail } from '../controllers/userController.js';
import { getNotifications, markAsRead, markAllAsRead } from '../controllers/notificationController.js';
import auth from '../middleware/auth.js';

const router = express.Router();

router.post('/signup', signupUser);
router.get('/verify/:token', verifyEmail);
router.post('/login', loginUser);
router.post('/google', googleAuth);
router.get('/profile', auth, getUserProfile);
router.put('/profile', auth, updateProfile);
router.post('/friends', auth, addFriend);
router.get('/friends', auth, getFriends);

// Notifications
router.get('/notifications', auth, getNotifications);
router.put('/notifications/read-all', auth, markAllAsRead);
router.put('/notifications/:id/read', auth, markAsRead);

export default router;
