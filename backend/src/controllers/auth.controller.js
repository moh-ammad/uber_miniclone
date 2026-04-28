import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import prisma from '../lib/prisma.js';

// Generate OTP
const generateOTP = () => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

// Register
export const register = async (req, res) => {
  try {
    const { email, password, name, phone, role, vehicleType, vehicleNumber, vehicleColor } = req.body;

    // Validation
    if (!email || !password || !name || !phone || !role) {
      return res.status(400).json({ error: 'All fields are required' });
    }

    if (role === 'DRIVER' && (!vehicleType || !vehicleNumber || !vehicleColor)) {
      return res.status(400).json({ error: 'Vehicle details required for drivers' });
    }

    // Check existing user
    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      return res.status(400).json({ error: 'Email already registered' });
    }

    const existingPhone = await prisma.user.findUnique({ where: { phone } });
    if (existingPhone) {
      return res.status(400).json({ error: 'Phone already registered' });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create user
    const user = await prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        name,
        phone,
        role,
        ...(role === 'DRIVER' && {
          vehicleType,
          vehicleNumber,
          vehicleColor
        })
      },
      select: {
        id: true,
        email: true,
        name: true,
        phone: true,
        role: true,
        vehicleType: true,
        vehicleNumber: true,
        vehicleColor: true
      }
    });

    // Generate token
    const token = jwt.sign({ userId: user.id }, process.env.JWT_SECRET, { expiresIn: '7d' });

    res.status(201).json({ user, token });
  } catch (error) {
    console.error('Register error:', error);
    res.status(500).json({ error: 'Registration failed' });
  }
};

// Login
export const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password required' });
    }

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const validPassword = await bcrypt.compare(password, user.password);
    if (!validPassword) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const token = jwt.sign({ userId: user.id }, process.env.JWT_SECRET, { expiresIn: '7d' });

    const { password: _, ...userWithoutPassword } = user;

    res.json({ user: userWithoutPassword, token });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Login failed' });
  }
};

// Get profile
export const getProfile = async (req, res) => {
  try {
    res.json({ user: req.user });
  } catch (error) {
    res.status(500).json({ error: 'Failed to get profile' });
  }
};

// Toggle driver availability
export const toggleAvailability = async (req, res) => {
  try {
    if (req.user.role !== 'DRIVER') {
      return res.status(403).json({ error: 'Only drivers can toggle availability' });
    }

    const user = await prisma.user.update({
      where: { id: req.user.id },
      data: { isAvailable: !req.user.isAvailable },
      select: { id: true, isAvailable: true }
    });

    res.json({ isAvailable: user.isAvailable });
  } catch (error) {
    res.status(500).json({ error: 'Failed to toggle availability' });
  }
};
