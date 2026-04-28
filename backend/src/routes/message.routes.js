import { Router } from 'express';
import { getRideMessages } from '../controllers/message.controller.js';
import { authenticate } from '../middleware/auth.js';

const router = Router();

router.get('/:rideId', authenticate, getRideMessages);

export default router;
