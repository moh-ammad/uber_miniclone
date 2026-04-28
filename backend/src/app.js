import express from 'express';
import cors from 'cors';
import authRoutes from './routes/auth.routes.js';
import rideRoutes from './routes/ride.routes.js';
import messageRoutes from './routes/message.routes.js';

const app = express();

// Middleware
app.use(cors({
  origin: 'http://localhost:5173',
  credentials: true
}));
app.use(express.json());

// Request logging middleware
app.use((req, res, next) => {
  console.log(`${req.method} ${req.path}`);
  next();
});

// Routes
app.get('/', (req, res) => {
  res.json({ message: 'Uber Clone API' });
});

app.use('/api/auth', authRoutes);
app.use('/api/rides', rideRoutes);
app.use('/api/messages', messageRoutes);

// 404 handler
app.use((req, res) => {
  console.log(`404 - Route not found: ${req.method} ${req.path}`);
  res.status(404).json({ error: 'Route not found' });
});

// Error handling
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: err.message || 'Something went wrong!' });
});

export default app;
