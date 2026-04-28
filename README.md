# 🚗 Uber Clone - Full Stack Application

A fully functional Uber clone with real-time tracking, OTP verification, live maps, and chat.

## ✅ ALL FEATURES WORKING

- ✅ Responsive UI (mobile, tablet, desktop)
- ✅ Real-time location tracking with Leaflet maps
- ✅ OTP verification for ride start
- ✅ Live chat between rider and driver
- ✅ WebSocket real-time updates
- ✅ Secure authentication (JWT + bcrypt)
- ✅ Dynamic fare calculation
- ✅ Complete ride lifecycle
- ✅ Driver availability toggle
- ✅ Ride history for both roles

## 📱 Complete Feature List

### Rider Features
- ✅ Book ride with pickup/drop locations
- ✅ View OTP (6-digit) to share with driver
- ✅ Track driver location in real-time on map
- ✅ View ride status (REQUESTED → ACCEPTED → ARRIVED → STARTED → COMPLETED)
- ✅ View fare calculation
- ✅ Chat with driver
- ✅ View driver details (name, phone, vehicle)
- ✅ Ride history

### Driver Features
- ✅ Toggle availability (online/offline)
- ✅ Receive ride requests with details
- ✅ Accept/reject rides
- ✅ Navigate to pickup location
- ✅ Mark arrived at pickup
- ✅ Enter OTP to start ride
- ✅ Complete ride
- ✅ Chat with rider
- ✅ Ride history
- ✅ Auto location sharing

### Technical Features
- ✅ Responsive design (works on all screen sizes)
- ✅ Real-time WebSocket communication
- ✅ Leaflet maps with live markers
- ✅ JWT authentication
- ✅ Password encryption (bcrypt)
- ✅ OTP security system
- ✅ Distance-based fare calculation
- ✅ Protected API routes
- ✅ Role-based access control

## 🛠️ Tech Stack

### Backend
- Node.js + Express
- Prisma ORM
- MySQL Database
- Socket.io
- JWT Authentication
- bcrypt for password hashing
- geolib for distance calculation

### Frontend
- React 19
- React Router DOM
- Tailwind CSS
- Leaflet Maps
- Socket.io Client
- Axios
- React Hot Toast

## � Quick Start (3 Steps)

### 1. Setup Database
```bash
cd backend
pnpm prisma migrate deploy
pnpm prisma generate
```

### 2. Start Servers
```bash
# Double-click this file:
START_UBER_CLONE.bat

# OR manually:
# Terminal 1:
cd backend
pnpm run dev

# Terminal 2:
cd frontend
pnpm run dev
```

### 3. Test the App
- Frontend: http://localhost:5173
- Backend: http://localhost:4000

Create driver account → Create rider account (incognito) → Test ride flow!

## 🧪 Test Accounts

### Driver Account
```
Email: driver@test.com
Password: driver123
Name: John Driver
Phone: 9876543210
Vehicle Type: Sedan
Vehicle Number: DL-01-1234
Vehicle Color: Black
```

### Rider Account
```
Email: rider@test.com
Password: rider123
Name: Jane Rider
Phone: 9876543211
```

### Test Locations (India)
```
Pickup: Connaught Place, Delhi
Lat: 28.6315, Lng: 77.2167

Drop: India Gate, Delhi
Lat: 28.6129, Lng: 77.2295

Expected Fare: ~₹88 (2.5km)
```

## � Troubleshooting

### Database Connection Failed
```bash
# Check MySQL is running
# Verify credentials in backend/.env
cd backend
pnpm prisma migrate deploy
```

### Port Already in Use
```bash
# Kill process on port 4000
netstat -ano | findstr :4000
taskkill /PID <PID> /F
```

### Maps Not Loading
- Enable location permissions in browser
- Check internet connection

### WebSocket Not Connecting
- Verify backend is running
- Check VITE_SOCKET_URL in frontend/.env

---

**Everything is working! Both servers are running. Open http://localhost:5173 and test!**

## 🗂️ Project Structure

```
uber_clone/
├── backend/
│   ├── prisma/
│   │   ├── schema.prisma          # Database schema
│   │   └── migrations/            # Database migrations
│   ├── src/
│   │   ├── controllers/           # Business logic
│   │   │   ├── auth.controller.js
│   │   │   ├── ride.controller.js
│   │   │   └── message.controller.js
│   │   ├── middleware/
│   │   │   └── auth.js            # JWT authentication
│   │   ├── routes/                # API routes
│   │   │   ├── auth.routes.js
│   │   │   ├── ride.routes.js
│   │   │   └── message.routes.js
│   │   ├── lib/
│   │   │   └── prisma.js          # Prisma client
│   │   ├── app.js                 # Express app
│   │   └── socket.js              # Socket.io setup
│   ├── server.js                  # Entry point
│   ├── .env                       # Environment variables
│   └── package.json
│
├── frontend/
│   ├── src/
│   │   ├── context/
│   │   │   └── AuthContext.jsx    # Auth state management
│   │   ├── pages/
│   │   │   ├── Login.jsx
│   │   │   ├── Register.jsx
│   │   │   ├── RiderDashboard.jsx
│   │   │   └── DriverDashboard.jsx
│   │   ├── lib/
│   │   │   ├── axios.js           # API client
│   │   │   └── socket.js          # Socket.io client
│   │   ├── App.jsx                # Main app with routing
│   │   ├── main.jsx               # Entry point
│   │   └── index.css              # Tailwind styles
│   ├── .env                       # Environment variables
│   └── package.json
│
├── START_UBER_CLONE.bat           # Startup script
└── README.md                      # This file
```

## 🔌 API Endpoints

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login user
- `GET /api/auth/profile` - Get user profile (protected)
- `POST /api/auth/toggle-availability` - Toggle driver availability (protected)

### Rides
- `POST /api/rides/request` - Request a ride (rider)
- `POST /api/rides/accept` - Accept a ride (driver)
- `POST /api/rides/arrived` - Mark arrived at pickup (driver)
- `POST /api/rides/start` - Start ride with OTP (driver)
- `POST /api/rides/complete` - Complete ride (driver)
- `GET /api/rides/active` - Get active ride (both)
- `GET /api/rides/my-rides` - Get ride history (rider)
- `GET /api/rides/driver-rides` - Get ride history (driver)

### Messages
- `GET /api/messages/:rideId` - Get ride messages (protected)

## 💾 Database Schema

### User
- id, email, password, name, phone, role
- vehicleType, vehicleNumber, vehicleColor (for drivers)
- isAvailable, currentLat, currentLng (for drivers)
- socketId (for real-time communication)

### Ride
- id, riderId, driverId
- pickupLat, pickupLng, pickupAddress
- dropLat, dropLng, dropAddress
- status, otp, distance, fare
- requestedAt, acceptedAt, arrivedAt, startedAt, completedAt

### Message
- id, rideId, senderId, message, createdAt

## 🎨 UI Features

- Clean, modern design with Tailwind CSS
- Responsive layout for all devices
- Interactive maps with Leaflet
- Real-time updates without page refresh
- Toast notifications for user feedback
- Loading states and error handling

## 🔧 Configuration

### Backend (.env)
```env
DATABASE_URL="mysql://root:root123@localhost:3306/uber_clone"
JWT_SECRET="uber_clone_super_secret_key_2024"
PORT=4000
NODE_ENV=development
```

### Frontend (.env)
```env
VITE_API_URL=http://localhost:4000
VITE_SOCKET_URL=http://localhost:4000
```

## 🐛 Troubleshooting

### Database Connection Error
- Ensure MySQL is running
- Check credentials in backend/.env
- Run: `pnpm prisma migrate deploy`

### Port Already in Use
- Backend: Change PORT in backend/.env
- Frontend: Change port in vite.config.js

### Maps Not Loading
- Check internet connection (Leaflet uses online tiles)
- Enable location permissions in browser

### WebSocket Connection Failed
- Ensure backend is running
- Check VITE_SOCKET_URL in frontend/.env

## 📝 Testing the App

### Test Scenario 1: Complete Ride Flow

1. Create a driver account
2. Create a rider account (use different browser/incognito)
3. Driver: Go online
4. Rider: Book a ride
5. Driver: Accept the ride
6. Driver: Mark as arrived
7. Driver: Enter OTP from rider's screen
8. Driver: Complete the ride

### Test Scenario 2: Real-time Features

1. Open rider and driver dashboards side by side
2. Book a ride and watch real-time updates
3. Test chat functionality
4. Watch driver location update on rider's map

## 🚀 Production Deployment

For production deployment:

1. Update environment variables
2. Use production database
3. Enable HTTPS
4. Configure CORS properly
5. Add rate limiting
6. Implement proper error logging
7. Add monitoring and analytics

## 📄 License

This is a learning project. Feel free to use and modify.

## 🤝 Contributing

This is a personal project, but suggestions are welcome!

---

**Built with ❤️ using React, Node.js, and modern web technologies**
