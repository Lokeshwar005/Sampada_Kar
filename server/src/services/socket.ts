import { Server as SocketIOServer } from 'socket.io';
import { Server as HttpServer } from 'http';

let io: SocketIOServer | null = null;

export function initSocket(server: HttpServer, allowedOrigin: string): SocketIOServer {
  io = new SocketIOServer(server, {
    cors: {
      origin: allowedOrigin,
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
    },
  });

  io.on('connection', (socket) => {
    // Client can join user-specific and role-specific rooms
    socket.on('join', ({ userId, role }: { userId?: string; role?: string }) => {
      if (userId) {
        socket.join(`user:${userId}`);
      }
      if (role) {
        socket.join(`role:${role}`);
      }
    });

    socket.on('leave', ({ userId, role }: { userId?: string; role?: string }) => {
      if (userId) {
        socket.leave(`user:${userId}`);
      }
      if (role) {
        socket.leave(`role:${role}`);
      }
    });

    socket.on('disconnect', () => {
      // Clean disconnect
    });
  });

  return io;
}

export function getIO(): SocketIOServer | null {
  return io;
}

export function emitToUser(userId: string, event: string, data: any) {
  if (io) {
    io.to(`user:${userId}`).emit(event, data);
  }
}

export function emitToRole(role: string, event: string, data: any) {
  if (io) {
    io.to(`role:${role}`).emit(event, data);
  }
}

export function emitBroadcast(event: string, data: any) {
  if (io) {
    io.emit(event, data);
  }
}
