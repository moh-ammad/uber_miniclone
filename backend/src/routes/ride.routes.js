import { Router } from 'express';
import {
  requestRide,
  acceptRide,
  arrivedAtPickup,
  startRide,
  completeRide,
  cancelRide,
  getPendingRideRequests,
  getPaymentSummary,
  confirmPayment,
  getUserRides,
  getDriverRides,
  getActiveRide
} from '../controllers/ride.controller.js';
import { authenticate, requireRole } from '../middleware/auth.js';

const router = Router();

// Rider routes
router.post('/request', authenticate, requestRide);
router.post('/cancel', authenticate, cancelRide);
router.post('/confirm-payment', authenticate, requireRole('RIDER'), confirmPayment);
router.get('/my-rides', authenticate, requireRole('RIDER'), getUserRides);
router.get('/payment-summary', authenticate, requireRole('RIDER'), getPaymentSummary);

// Driver routes
router.post('/accept', authenticate, requireRole('DRIVER'), acceptRide);
router.post('/arrived', authenticate, requireRole('DRIVER'), arrivedAtPickup);
router.post('/start', authenticate, requireRole('DRIVER'), startRide);
router.post('/complete', authenticate, requireRole('DRIVER'), completeRide);
router.get('/driver-rides', authenticate, requireRole('DRIVER'), getDriverRides);
router.get('/pending-requests', authenticate, requireRole('DRIVER'), getPendingRideRequests);

// Both
router.get('/active', authenticate, getActiveRide);

export default router;
