import { io } from 'socket.io-client';

let socket = null;
let currentUserId = null;

export const initSocket = (userId) => {
  currentUserId = userId;

  if (!socket) {
    socket = io(import.meta.env.VITE_SOCKET_URL || 'http://localhost:4000', {
      transports: ['websocket'],
      reconnection: true
    });

    socket.on('connect', () => {
      console.log('✅ Socket connected:', socket.id);
      if (currentUserId) {
        socket.emit('join', { userId: currentUserId });
      }
    });

    socket.on('disconnect', () => {
      console.log('❌ Socket disconnected');
    });
  }

  if (socket?.connected && currentUserId) {
    socket.emit('join', { userId: currentUserId });
  }

  return socket;
};

export const getSocket = () => socket;

export const disconnectSocket = () => {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
  currentUserId = null;
};
