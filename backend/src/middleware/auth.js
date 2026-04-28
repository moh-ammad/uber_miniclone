import jwt from 'jsonwebtoken';
import prisma from '../lib/prisma.js';

export const authenticate = async (req, res, next) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    
    if (!token) {
      console.log('Authentication failed: No token provided');
      return res.status(401).json({ error: 'No token provided' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      select: {
        id: true,
        email: true,
        name: true,
        phone: true,
        role: true,
        vehicleType: true,
        vehicleNumber: true,
        vehicleColor: true,
        isAvailable: true
      }
    });

    if (!user) {
      console.log('Authentication failed: User not found');
      return res.status(401).json({ error: 'User not found' });
    }

    req.user = user;
    next();
  } catch (error) {
    console.log('Authentication failed:', error.message);
    return res.status(401).json({ error: 'Invalid token' });
  }
};

export const requireRole = (role) => {
  return (req, res, next) => {
    if (req.user.role !== role) {
      return res.status(403).json({ error: 'Forbidden' });
    }
    next();
  };
};
