import { Server } from 'socket.io';
import prisma from './lib/prisma.js';

let io;

export const initSocket = (server) => {
  io = new Server(server, {
    cors: {
      origin: 'http://localhost:5173',
      credentials: true
    }
  });

  io.on('connection', (socket) => {
    console.log(`✅ Client connected: ${socket.id}`);

    // User joins with their ID
    socket.on('join', async ({ userId }) => {
      try {
        await prisma.user.update({
          where: { id: userId },
          data: { socketId: socket.id }
        });
        console.log(`👤 User ${userId} joined with socket ${socket.id}`);
      } catch (error) {
        console.error('Join error:', error);
      }
    });

    // Driver location update
    socket.on('location_update', async ({ userId, lat, lng }) => {
      try {
        await prisma.user.update({
          where: { id: userId },
          data: { currentLat: lat, currentLng: lng }
        });
        
        // Broadcast to active rides
        const activeRides = await prisma.ride.findMany({
          where: {
            driverId: userId,
            status: { in: ['ACCEPTED', 'ARRIVED', 'STARTED'] }
          },
          include: { rider: true }
        });

        activeRides.forEach(ride => {
          if (ride.rider.socketId) {
            io.to(ride.rider.socketId).emit('driver_location', { lat, lng });
          }
        });
      } catch (error) {
        console.error('Location update error:', error);
      }
    });

    // Chat message
    socket.on('send_message', async ({ rideId, senderId, message }) => {
      try {
        const normalizedSenderId = Number(senderId);
        const normalizedRideId = Number(rideId);

        if (!normalizedRideId || !normalizedSenderId || !message) {
          return;
        }

        const newMessage = await prisma.message.create({
          data: { rideId: normalizedRideId, senderId: normalizedSenderId, message },
          include: { sender: { select: { name: true, role: true } } }
        });

        const ride = await prisma.ride.findUnique({
          where: { id: normalizedRideId },
          include: { rider: true, driver: true }
        });

        if (!ride) {
          return;
        }

        const isRiderSender = normalizedSenderId === ride.riderId;
        const recipientSocketId = isRiderSender ? ride.driver?.socketId : ride.rider.socketId;

        if (recipientSocketId && recipientSocketId !== socket.id) {
          io.to(recipientSocketId).emit('receive_message', {
            id: newMessage.id,
            message: newMessage.message,
            senderName: newMessage.sender.name,
            senderRole: newMessage.sender.role,
            createdAt: newMessage.createdAt
          });
        }
      } catch (error) {
        console.error('Message error:', error);
      }
    });

    socket.on('disconnect', async () => {
      try {
        await prisma.user.updateMany({
          where: { socketId: socket.id },
          data: { socketId: null }
        });
        console.log(`❌ Client disconnected: ${socket.id}`);
      } catch (error) {
        console.error('Disconnect cleanup error:', error);
      }
    });
  });

  return io;
};

export const getIO = () => {
  if (!io) throw new Error('Socket.io not initialized');
  return io;
};

export const emitToUser = (socketId, event, data) => {
  if (io && socketId) {
    io.to(socketId).emit(event, data);
  }
};
