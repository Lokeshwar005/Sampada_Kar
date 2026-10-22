import http from 'http';
import dotenv from 'dotenv';
import { app } from './app.js';
import { initSocket } from './services/socket.js';

dotenv.config();

const PORT = process.env.PORT || 5000;
const corsOrigin = process.env.CORS_ORIGIN || 'http://localhost:5173';

const server = http.createServer(app);

// Initialize real-time Socket.IO
initSocket(server, corsOrigin);

server.listen(PORT, () => {
  console.log(`🏛️ Sampada Kar API & WebSocket Server running on port ${PORT}`);
  console.log(`🔗 Health check available at http://localhost:${PORT}/api/health`);
});
