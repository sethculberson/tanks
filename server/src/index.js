import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import { createGameState, updateGameState } from './gameState.js';

const app = express();
app.use(cors());
app.use(express.json());

const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: { origin: '*', methods: ['GET', 'POST'] }
});

let gameState = createGameState();
let connectedPlayers = {}; // socketId -> playerId

// Game loop
let lastTime = Date.now();
const TICK_RATE = 60;

setInterval(() => {
  const now = Date.now();
  const dt = (now - lastTime) / 1000;
  lastTime = now;

  updateGameState(gameState, dt);
  io.emit('gameState', serializeState(gameState));
}, 1000 / TICK_RATE);

function serializeState(state) {
  return {
    players: state.players,
    bullets: state.bullets,
    scores: state.scores,
    gameOver: state.gameOver,
    winner: state.winner,
  };
}

io.on('connection', (socket) => {
  console.log('Client connected:', socket.id);

  // Send maze on connect
  socket.emit('maze', gameState.maze);
  socket.emit('gameState', serializeState(gameState));

  socket.on('input', (data) => {
    // data: { playerId: 'p1'|'p2', input: { up, down, left, right, shoot } }
    const { playerId, input } = data;
    if (gameState.players[playerId]) {
      gameState.players[playerId].input = input;
    }
  });

  socket.on('restart', () => {
    gameState = createGameState();
    io.emit('maze', gameState.maze);
    io.emit('gameState', serializeState(gameState));
  });

  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id);
  });
});

// REST: get current maze
app.get('/api/maze', (req, res) => {
  res.json(gameState.maze);
});

app.get('/api/state', (req, res) => {
  res.json(serializeState(gameState));
});

const PORT = 3001;
httpServer.listen(PORT, () => {
  console.log(`Tank Trouble server running on port ${PORT}`);
});
