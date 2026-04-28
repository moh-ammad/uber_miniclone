import prisma from '../lib/prisma.js';
import { getDistance } from 'geolib';
import { emitToUser } from '../socket.js';

// Generate OTP
const generateOTP = () => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

// Calculate fare (base + per km)
const calculateFare = (distanceInMeters) => {
  const distanceInKm = distanceInMeters / 1000;
  const baseFare = 50;
  const perKm = 15;
  const fare = Math.round(baseFare + (distanceInKm * perKm));
  
  // Cap maximum fare at 500 to prevent unrealistic amounts
  return Math.min(fare, 500);
};

// Request ride
export const requestRide = async (req, res) => {
  try {
    const { pickupLat, pickupLng, pickupAddress, dropLat, dropLng, dropAddress } = req.body;

    if (
      pickupLat === undefined ||
      pickupLng === undefined ||
      dropLat === undefined ||
      dropLng === undefined
    ) {
      return res.status(400).json({ error: 'All location fields required' });
    }

    const hasActiveRide = await prisma.ride.findFirst({
      where: {
        riderId: req.user.id,
        status: { in: ['REQUESTED', 'ACCEPTED', 'ARRIVED', 'STARTED'] }
      },
      select: { id: true }
    });

    if (hasActiveRide) {
      return res.status(400).json({ error: 'You already have an active ride' });
    }

    // Calculate distance
    const distance = getDistance(
      { latitude: pickupLat, longitude: pickupLng },
      { latitude: dropLat, longitude: dropLng }
    );

    console.log('Distance calculation:', {
      pickup: { lat: pickupLat, lng: pickupLng },
      drop: { lat: dropLat, lng: dropLng },
      distanceMeters: distance,
      distanceKm: (distance / 1000).toFixed(2)
    });

    // Validate distance (max 100km for reasonable rides)
    const distanceInKm = distance / 1000;
    if (distanceInKm > 100) {
      return res.status(400).json({ 
        error: `Distance too far (${distanceInKm.toFixed(1)} km). Maximum allowed is 100 km.` 
      });
    }

    if (distanceInKm < 0.5) {
      return res.status(400).json({ 
        error: 'Pickup and drop locations are too close. Minimum distance is 0.5 km.' 
      });
    }

    const fare = calculateFare(distance);
    console.log('Calculated fare for distance', distanceInKm.toFixed(2), 'km:', fare);
    const otp = generateOTP();

    // Create ride
    const ride = await prisma.ride.create({
      data: {
        riderId: req.user.id,
        pickupLat,
        pickupLng,
        pickupAddress,
        dropLat,
        dropLng,
        dropAddress,
        otp,
        distance: distance / 1000, // km
        fare
      },
      include: {
        rider: {
          select: { id: true, name: true, phone: true }
        }
      }
    });

    // Find nearby available drivers
    const drivers = await prisma.user.findMany({
      where: {
        role: 'DRIVER',
        isAvailable: true,
        socketId: { not: null }
      }
    });

    // Notify all available drivers
    drivers.forEach(driver => {
      emitToUser(driver.socketId, 'new_ride_request', {
        rideId: ride.id,
        pickupAddress,
        dropAddress,
        fare,
        distance: (distance / 1000).toFixed(2),
        riderName: ride.rider.name
      });
    });

    res.status(201).json({ ride });
  } catch (error) {
    console.error('Request ride error:', error);
    res.status(500).json({ error: 'Failed to request ride' });
  }
};

// Accept ride
export const acceptRide = async (req, res) => {
  try {
    const { rideId } = req.body;
    const parsedRideId = Number(rideId);

    if (!parsedRideId) {
      return res.status(400).json({ error: 'Valid rideId is required' });
    }

    const driverBusy = await prisma.ride.findFirst({
      where: {
        driverId: req.user.id,
        status: { in: ['ACCEPTED', 'ARRIVED', 'STARTED'] }
      },
      select: { id: true }
    });

    if (driverBusy) {
      return res.status(400).json({ error: 'You already have an active ride' });
    }

    const ride = await prisma.ride.findUnique({
      where: { id: parsedRideId },
      include: { rider: true }
    });

    if (!ride) {
      return res.status(404).json({ error: 'Ride not found' });
    }

    if (ride.status !== 'REQUESTED') {
      return res.status(400).json({ error: 'Ride already accepted' });
    }

    // Update ride
    const updatedRide = await prisma.ride.update({
      where: { id: parsedRideId },
      data: {
        driverId: req.user.id,
        status: 'ACCEPTED',
        acceptedAt: new Date()
      },
      include: {
        driver: {
          select: {
            id: true,
            name: true,
            phone: true,
            vehicleType: true,
            vehicleNumber: true,
            vehicleColor: true,
            currentLat: true,
            currentLng: true
          }
        }
      }
    });

    // Notify rider
    if (ride.rider.socketId) {
      emitToUser(ride.rider.socketId, 'ride_accepted', {
        rideId: updatedRide.id,
        driver: updatedRide.driver,
        otp: updatedRide.otp
      });
    }

    res.json({ ride: updatedRide });
  } catch (error) {
    console.error('Accept ride error:', error);
    res.status(500).json({ error: 'Failed to accept ride' });
  }
};

// Driver arrived
export const arrivedAtPickup = async (req, res) => {
  try {
    const { rideId } = req.body;
    const parsedRideId = Number(rideId);

    if (!parsedRideId) {
      return res.status(400).json({ error: 'Valid rideId is required' });
    }

    const existingRide = await prisma.ride.findUnique({
      where: { id: parsedRideId },
      include: { rider: true }
    });

    if (!existingRide || existingRide.driverId !== req.user.id) {
      return res.status(404).json({ error: 'Ride not found' });
    }

    if (existingRide.status !== 'ACCEPTED') {
      return res.status(400).json({ error: 'Ride must be accepted first' });
    }

    const ride = await prisma.ride.update({
      where: { id: parsedRideId },
      data: {
        status: 'ARRIVED',
        arrivedAt: new Date()
      },
      include: { rider: true }
    });

    // Notify rider
    if (ride.rider.socketId) {
      emitToUser(ride.rider.socketId, 'driver_arrived', {
        rideId: ride.id,
        message: 'Driver has arrived at pickup location'
      });
    }

    res.json({ ride });
  } catch (error) {
    res.status(500).json({ error: 'Failed to update status' });
  }
};

// Start ride with OTP
export const startRide = async (req, res) => {
  try {
    const { rideId, otp } = req.body;
    const parsedRideId = Number(rideId);

    if (!parsedRideId) {
      return res.status(400).json({ error: 'Valid rideId is required' });
    }

    const ride = await prisma.ride.findUnique({
      where: { id: parsedRideId },
      include: { rider: true }
    });

    if (!ride || ride.driverId !== req.user.id) {
      return res.status(404).json({ error: 'Ride not found' });
    }

    if (ride.otp !== otp) {
      return res.status(400).json({ error: 'Invalid OTP' });
    }

    if (ride.status !== 'ARRIVED' && ride.status !== 'ACCEPTED') {
      return res.status(400).json({ error: 'Cannot start ride' });
    }

    const updatedRide = await prisma.ride.update({
      where: { id: parsedRideId },
      data: {
        status: 'STARTED',
        startedAt: new Date()
      }
    });

    // Notify rider
    if (ride.rider.socketId) {
      emitToUser(ride.rider.socketId, 'ride_started', {
        rideId: updatedRide.id,
        message: 'Your ride has started'
      });
    }

    res.json({ ride: updatedRide });
  } catch (error) {
    console.error('Start ride error:', error);
    res.status(500).json({ error: 'Failed to start ride' });
  }
};

// Complete ride
export const completeRide = async (req, res) => {
  try {
    const { rideId } = req.body;
    const parsedRideId = Number(rideId);

    if (!parsedRideId) {
      return res.status(400).json({ error: 'Valid rideId is required' });
    }

    const existingRide = await prisma.ride.findUnique({
      where: { id: parsedRideId },
      include: { rider: true }
    });

    if (!existingRide || existingRide.driverId !== req.user.id) {
      return res.status(404).json({ error: 'Ride not found' });
    }

    if (existingRide.status !== 'STARTED') {
      return res.status(400).json({ error: 'Ride must be started before completion' });
    }

    const ride = await prisma.ride.update({
      where: { id: parsedRideId },
      data: {
        status: 'COMPLETED',
        completedAt: new Date(),
        paymentStatus: 'PENDING'
      },
      include: { rider: true }
    });

    // Notify rider
    if (ride.rider.socketId) {
      emitToUser(ride.rider.socketId, 'ride_completed', {
        rideId: ride.id,
        fare: ride.fare,
        message: 'Ride completed successfully'
      });
    }

    res.json({ ride });
  } catch (error) {
    console.error('Complete ride error:', error);
    res.status(500).json({ error: 'Failed to complete ride' });
  }
};

// Cancel ride by rider before ride starts
export const cancelRide = async (req, res) => {
  try {
    const { rideId } = req.body;
    const parsedRideId = Number(rideId);

    if (!parsedRideId) {
      return res.status(400).json({ error: 'Valid rideId is required' });
    }

    const ride = await prisma.ride.findUnique({
      where: { id: parsedRideId },
      include: {
        rider: true,
        driver: true
      }
    });

    if (!ride || ride.riderId !== req.user.id) {
      return res.status(403).json({ error: 'Only the rider who booked the ride can cancel it' });
    }

    if (!['REQUESTED', 'ACCEPTED', 'ARRIVED'].includes(ride.status)) {
      return res.status(400).json({ error: 'Cannot cancel this ride now' });
    }

    const updatedRide = await prisma.ride.update({
      where: { id: parsedRideId },
      data: {
        status: 'CANCELLED',
        paymentStatus: 'NOT_REQUIRED'
      }
    });

    // Notify assigned driver, or all available drivers for pending requests
    if (ride.driver?.socketId) {
      emitToUser(ride.driver.socketId, 'ride_cancelled', {
        rideId: ride.id,
        message: `${ride.rider.name} cancelled the ride`,
        riderName: ride.rider.name
      });
      console.log(`Notified driver ${ride.driver.name} about ride cancellation`);
    } else if (ride.status === 'REQUESTED') {
      const drivers = await prisma.user.findMany({
        where: {
          role: 'DRIVER',
          isAvailable: true,
          socketId: { not: null }
        },
        select: { socketId: true }
      });

      drivers.forEach((driver) => {
        emitToUser(driver.socketId, 'ride_cancelled', {
          rideId: ride.id,
          message: `${ride.rider.name} cancelled the request`,
          riderName: ride.rider.name
        });
      });
    }

    res.json({ ride: updatedRide });
  } catch (error) {
    console.error('Cancel ride error:', error);
    res.status(500).json({ error: 'Failed to cancel ride' });
  }
};

// List pending ride requests for drivers
export const getPendingRideRequests = async (req, res) => {
  try {
    const rides = await prisma.ride.findMany({
      where: { status: 'REQUESTED' },
      include: {
        rider: {
          select: { id: true, name: true, phone: true }
        }
      },
      orderBy: { requestedAt: 'desc' },
      take: 20
    });

    const requests = rides.map((ride) => ({
      rideId: ride.id,
      pickupAddress: ride.pickupAddress,
      dropAddress: ride.dropAddress,
      fare: ride.fare,
      distance: ride.distance?.toFixed(2) || '0.00',
      riderName: ride.rider.name,
      riderPhone: ride.rider.phone
    }));

    res.json({ requests });
  } catch (error) {
    console.error('Get pending requests error:', error);
    res.status(500).json({ error: 'Failed to fetch pending requests' });
  }
};

// Rider payment summary
export const getPaymentSummary = async (req, res) => {
  try {
    const completedAggregate = await prisma.ride.aggregate({
      where: {
        riderId: req.user.id,
        status: 'COMPLETED'
      },
      _count: { id: true }
    });

    const paidAggregate = await prisma.ride.aggregate({
      where: {
        riderId: req.user.id,
        status: 'COMPLETED',
        paymentStatus: 'PAID'
      },
      _sum: { fare: true }
    });

    res.json({
      totalRides: completedAggregate._count.id,
      totalPaid: Number(paidAggregate._sum.fare || 0)
    });
  } catch (error) {
    console.error('Payment summary error:', error);
    res.status(500).json({ error: 'Failed to fetch payment summary' });
  }
};

// Rider confirms payment after ride completion
export const confirmPayment = async (req, res) => {
  try {
    if (req.user.role !== 'RIDER') {
      return res.status(403).json({ error: 'Only riders can confirm payments' });
    }

    console.log('=== Payment Confirmation Request ===');
    console.log('Request body:', req.body);
    console.log('User ID:', req.user.id);
    console.log('User role:', req.user.role);
    
    const { rideId } = req.body;
    const parsedRideId = Number(rideId);

    if (!parsedRideId || isNaN(parsedRideId)) {
      console.log('Invalid rideId:', rideId, 'Parsed:', parsedRideId);
      return res.status(400).json({ error: 'Valid rideId is required' });
    }

    console.log('Looking for ride with ID:', parsedRideId);

    const ride = await prisma.ride.findUnique({
      where: { id: parsedRideId },
      include: {
        rider: true,
        driver: true
      }
    });

    if (!ride) {
      console.log('Ride not found in database');
      return res.status(404).json({ error: 'Ride not found in database' });
    }

    console.log('Found ride:', {
      id: ride.id,
      status: ride.status,
      riderId: ride.riderId,
      requestUserId: req.user.id,
      paymentStatus: ride.paymentStatus
    });

    if (ride.riderId !== req.user.id) {
      console.log('Unauthorized: Ride belongs to user', ride.riderId, 'but request from', req.user.id);
      return res.status(403).json({ error: 'This ride does not belong to you' });
    }

    if (ride.status !== 'COMPLETED') {
      console.log('Ride not completed, current status:', ride.status);
      return res.status(400).json({ error: `Cannot pay for ride with status: ${ride.status}. Ride must be completed first.` });
    }

    if (ride.paymentStatus === 'PAID') {
      console.log('Ride already paid');
      return res.status(400).json({ error: 'This ride has already been paid' });
    }

    const updatedRide = await prisma.ride.update({
      where: { id: parsedRideId },
      data: {
        paymentStatus: 'PAID',
        paidAt: new Date()
      }
    });

    console.log('Payment confirmed successfully for ride:', updatedRide.id);

    if (ride.driver?.socketId) {
      emitToUser(ride.driver.socketId, 'payment_confirmed', {
        rideId: ride.id,
        fare: ride.fare,
        message: 'Rider confirmed payment'
      });
    }

    res.json({
      success: true,
      rideId: updatedRide.id,
      paidBy: 'RIDER',
      amount: updatedRide.fare,
      paymentStatus: updatedRide.paymentStatus,
      paidAt: updatedRide.paidAt
    });
  } catch (error) {
    console.error('Confirm payment error:', error);
    res.status(500).json({ error: 'Failed to confirm payment: ' + error.message });
  }
};

// Get user rides
export const getUserRides = async (req, res) => {
  try {
    const rides = await prisma.ride.findMany({
      where: { riderId: req.user.id },
      include: {
        driver: {
          select: {
            name: true,
            phone: true,
            vehicleType: true,
            vehicleNumber: true,
            vehicleColor: true
          }
        }
      },
      orderBy: { requestedAt: 'desc' },
      take: 20
    });

    res.json({ rides });
  } catch (error) {
    res.status(500).json({ error: 'Failed to get rides' });
  }
};

// Get driver rides
export const getDriverRides = async (req, res) => {
  try {
    const rides = await prisma.ride.findMany({
      where: { driverId: req.user.id },
      include: {
        rider: {
          select: { name: true, phone: true }
        }
      },
      orderBy: { requestedAt: 'desc' },
      take: 20
    });

    res.json({ rides });
  } catch (error) {
    res.status(500).json({ error: 'Failed to get rides' });
  }
};

// Get active ride
export const getActiveRide = async (req, res) => {
  try {
    const where = req.user.role === 'RIDER'
      ? { riderId: req.user.id }
      : { driverId: req.user.id };

    const ride = await prisma.ride.findFirst({
      where: {
        ...where,
        status: { in: ['REQUESTED', 'ACCEPTED', 'ARRIVED', 'STARTED'] }
      },
      include: {
        rider: {
          select: { id: true, name: true, phone: true }
        },
        driver: {
          select: {
            id: true,
            name: true,
            phone: true,
            vehicleType: true,
            vehicleNumber: true,
            vehicleColor: true,
            currentLat: true,
            currentLng: true
          }
        }
      }
    });

    res.json({ ride });
  } catch (error) {
    res.status(500).json({ error: 'Failed to get active ride' });
  }
};
