import 'dotenv/config';
import { createServer } from 'http';
import app from './src/app.js';
import { initSocket } from './src/socket.js';

const PORT = process.env.PORT || 4000;
const server = createServer(app);

// Initialize Socket.io
initSocket(server);

server.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📡 Socket.io ready`);
});
