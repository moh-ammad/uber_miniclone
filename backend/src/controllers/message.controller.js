import prisma from '../lib/prisma.js';

export const getRideMessages = async (req, res) => {
  try {
    const { rideId } = req.params;
    const parsedRideId = parseInt(rideId, 10);

    const ride = await prisma.ride.findUnique({
      where: { id: parsedRideId },
      select: { riderId: true, driverId: true }
    });

    if (!ride) {
      return res.status(404).json({ error: 'Ride not found' });
    }

    if (ride.riderId !== req.user.id && ride.driverId !== req.user.id) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    const messages = await prisma.message.findMany({
      where: { rideId: parsedRideId },
      include: {
        sender: {
          select: { name: true, role: true }
        }
      },
      orderBy: { createdAt: 'asc' }
    });

    res.json({ messages });
  } catch (error) {
    res.status(500).json({ error: 'Failed to get messages' });
  }
};
