import 'dotenv/config';
import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { initFirebase } from './services/firebase.js';
import userRoutes from './routes/userRoutes.js';
import {
  createRoom,
  joinRoom,
  findOrCreateRandomRoom,
  handleInput,
  handleRestart,
  handleDisconnect,
  getRoomMaze,
  getRoomPlayers,
  getRoomMaxPlayers,
  setRoomUsername,
  playerMap,
} from './game/rooms.js';
import type { PlayerInput } from './game/gameState.js';

initFirebase();

const __dirname = dirname(fileURLToPath(import.meta.url));
const isProd = process.env.NODE_ENV === 'production';
const clientDist = join(__dirname, '../../client/dist');

const app = express();
app.use(cors({ origin: process.env.CORS_ORIGIN || '*' }));
app.use(express.json());

// Serve compiled React client in production
if (isProd) {
  app.use(express.static(clientDist));
}

const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: { origin: process.env.CORS_ORIGIN || '*', methods: ['GET', 'POST'] },
});

io.on('connection', (socket) => {
  console.log('Client connected:', socket.id);

  // Player wants to create a private room
  socket.on('create_room', ({ maxPlayers }: { maxPlayers?: number } = {}) => {
    const playerCount = Math.min(Math.max(maxPlayers ?? 2, 2), 6);
    const code = createRoom(socket.id, io, playerCount);
    socket.join(code);
    socket.emit('room_created', { roomCode: code, role: 'p1', maxPlayers: playerCount });
    socket.emit('lobby_update', { current: 1, max: playerCount });
  });

  // Player wants to join a specific room by code
  socket.on('join_room', ({ roomCode }: { roomCode: string }) => {
    const code = roomCode?.toUpperCase().trim();
    const result = joinRoom(code, socket.id, io);
    if ('error' in result) {
      socket.emit('join_error', { message: result.error });
      return;
    }
    socket.join(code);

    if (result.isFull) {
      // Room is full — game starts now
      const maze = getRoomMaze(socket.id);
      io.to(code).emit('maze', maze);
      // Notify each player of their specific role
      for (const [role, sid] of Object.entries(getRoomPlayers(code))) {
        if (sid) io.to(sid).emit('matched', { roomCode: code, role });
      }
    } else {
      // Room partially filled — notify new joiner of their role, update everyone's count
      socket.emit('room_joined', {
        roomCode: code,
        role: result.role,
        current: result.currentPlayers,
        max: getRoomMaxPlayers(code),
      });
      io.to(code).emit('lobby_update', { current: result.currentPlayers, max: getRoomMaxPlayers(code) });
    }
  });

  // Player wants a random match
  socket.on('random_match', () => {
    const result = findOrCreateRandomRoom(socket.id, io);
    if (result.error) {
      socket.emit('join_error', { message: result.error });
      return;
    }
    socket.join(result.code);
    if (!result.waiting) {
      // Both players now matched — notify both
      const maze = getRoomMaze(socket.id);
      io.to(result.code).emit('maze', maze);
      socket.emit('matched', { roomCode: result.code, role: result.role });
      if (result.partnerSocketId) {
        io.to(result.partnerSocketId).emit('matched', { roomCode: result.code, role: 'p1' });
      }
    }
    // If waiting: p1 just waits silently until p2 joins
  });

  // Associate a logged-in username with this socket's room slot
  socket.on('set_username', (username: string | null) => {
    setRoomUsername(socket.id, username ?? null);
  });

  // Input from player — server looks up role from socket mapping
  socket.on('input', (input: PlayerInput) => {
    handleInput(socket.id, input);
  });

  // Restart game in this room
  socket.on('restart', () => {
    handleRestart(socket.id);
  });

  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id);
    const result = handleDisconnect(socket.id);
    if (result?.otherSocketIds.length) {
      for (const sid of result.otherSocketIds) {
        io.to(sid).emit('opponent_disconnected');
      }
    }
  });
});

// REST
app.use('/api/auth', userRoutes);
app.get('/api/health', (_req, res) => res.json({ ok: true }));

// SPA fallback — must be after API routes
if (isProd) {
  app.get('*', (_req, res) => res.sendFile(join(clientDist, 'index.html')));
}

const PORT = process.env.PORT || 3001;
httpServer.listen(PORT, () => {
  console.log(`Tank Trouble server running on port ${PORT}`);
});
