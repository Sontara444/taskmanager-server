import express from 'express';
import { registerUser, loginUser, logoutUser, getMe, getUsers, updateProfile } from '../controllers/auth.controller';
import { protect } from '../middleware/auth.middleware';

const router = express.Router();

router.post('/register', registerUser);
router.post('/login', loginUser);
router.post('/logout', logoutUser);
router.get('/me', protect, getMe);
router.get('/users', protect, getUsers);
router.put('/profile', protect, updateProfile);

export default router;
