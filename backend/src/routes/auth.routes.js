import { Router } from 'express';
import { register, login, getProfile, toggleAvailability } from '../controllers/auth.controller.js';
import { authenticate } from '../middleware/auth.js';

const router = Router();

router.post('/register', register);
router.post('/login', login);
router.get('/profile', authenticate, getProfile);
router.post('/toggle-availability', authenticate, toggleAvailability);

export default router;
