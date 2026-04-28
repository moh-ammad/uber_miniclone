import express from 'express';
import cors from 'cors';
import authRoutes from './routes/auth.routes.js';
import rideRoutes from './routes/ride.routes.js';
import messageRoutes from './routes/message.routes.js';

const app = express();

// ✅ Allowed origins
const allowedOrigins = [
  'http://localhost:5173',
  'https://uber-miniclone.vercel.app'
];

// ✅ CORS options
const corsOptions = {
  origin: function (origin, callback) {
    // allow requests with no origin (Postman, mobile apps, etc.)
    if (!origin) return callback(null, true);

    if (
      allowedOrigins.includes(origin) ||
      origin.endsWith('.vercel.app') // allow preview deployments
    ) {
      return callback(null, true);
    } else {
      return callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true
};

// ✅ Middleware
app.use(cors(corsOptions));

// ✅ Handle preflight requests (IMPORTANT)
app.options('/{*splat}', cors(corsOptions));

app.use(express.json());

// ✅ Request logging
app.use((req, res, next) => {
  console.log(`${req.method} ${req.path}`);
  next();
});

// ✅ Routes
app.get('/', (req, res) => {
  res.json({ message: 'Uber Clone API' });
});

app.use('/api/auth', authRoutes);
app.use('/api/rides', rideRoutes);
app.use('/api/messages', messageRoutes);

// ✅ 404 handler
app.use((req, res) => {
  console.log(`404 - Route not found: ${req.method} ${req.path}`);
  res.status(404).json({ error: 'Route not found' });
});

// ✅ Error handler
app.use((err, req, res, next) => {
  console.error(err.stack);

  if (err.message === 'Not allowed by CORS') {
    return res.status(403).json({ error: 'CORS blocked this request' });
  }

  res.status(500).json({
    error: err.message || 'Something went wrong!'
  });
});

export default app;