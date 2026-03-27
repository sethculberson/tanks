import { createGameState, updateGameState } from './gameState.js';
import { updateUserStats, getUser } from './userService.js';

// roomCode -> Room
const rooms = new Map();
// socketId -> { roomCode, role }
const playerMap = new Map();
// random match queue: array of socketIds waiting
const queue = [];

const TICK_RATE = 60;

function generateRoomCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ'; // no I or O (ambiguous)
  let code;
  do {
    code = Array.from({ length: 4 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
  } while (rooms.has(code));
  return code;
}

function serializeState(state) {
  return {
    players: state.players,
    bullets: state.bullets,
    scores: state.scores,
    gameOver: state.gameOver,
    winner: state.winner,
  };
}

function startRoomLoop(room) {
  if (room.intervalId) return;
  room.lastTime = Date.now();
  room.statsCommitted = false;
  room.intervalId = setInterval(async () => {
    const now = Date.now();
    const dt = (now - room.lastTime) / 1000;
    room.lastTime = now;
    updateGameState(room.state, dt);
    room.io.to(room.code).emit('gameState', serializeState(room.state));

    // Persist round stats exactly once when the game ends
    if (room.state.gameOver && !room.statsCommitted) {
      room.statsCommitted = true;
      await commitRoundStats(room);
    }
  }, 1000 / TICK_RATE);
}

async function commitRoundStats(room) {
  const { winner, roundStats } = room.state;
  const tasks = [];

  for (const role of ['p1', 'p2']) {
    const username = room.usernames[role];
    if (!username) continue;
    tasks.push(
      updateUserStats(username, {
        totalGames: 1,
        totalWins: winner === role ? 1 : 0,
        totalLosses: winner !== role ? 1 : 0,
        ...roundStats[role],
      })
    );
  }
  await Promise.all(tasks);

  // Push refreshed stats back to each player
  for (const role of ['p1', 'p2']) {
    const socketId = room.players[role];
    const username = room.usernames[role];
    if (!socketId || !username) continue;
    const result = await getUser(username);
    if (result.success) {
      room.io.to(socketId).emit('stats_updated', result.user);
    }
  }
}

function setRoomUsername(socketId, username) {
  const info = playerMap.get(socketId);
  if (!info) return;
  const room = rooms.get(info.roomCode);
  if (!room) return;
  room.usernames[info.role] = username ? username.toLowerCase().trim() : null;
}

function createRoom(p1SocketId, io) {
  const code = generateRoomCode();
  const room = {
    code,
    state: createGameState(),
    players: { p1: p1SocketId, p2: null },
    usernames: { p1: null, p2: null },
    io,
    intervalId: null,
    lastTime: Date.now(),
    statsCommitted: false,
  };
  rooms.set(code, room);
  playerMap.set(p1SocketId, { roomCode: code, role: 'p1' });
  return code;
}

function joinRoom(code, p2SocketId, io) {
  const room = rooms.get(code);
  if (!room) return { error: 'Room not found' };
  if (room.players.p2) return { error: 'Room is full' };
  room.players.p2 = p2SocketId;
  playerMap.set(p2SocketId, { roomCode: code, role: 'p2' });
  startRoomLoop(room);
  return { success: true };
}

function findOrCreateRandomRoom(socketId, io) {
  // Drain stale entries from queue
  while (queue.length > 0 && !playerMap.has(queue[0])) {
    queue.shift();
  }

  if (queue.length > 0) {
    const p1SocketId = queue.shift();
    const p1info = playerMap.get(p1SocketId);
    if (!p1info) return findOrCreateRandomRoom(socketId, io);
    joinRoom(p1info.roomCode, socketId, io);
    return { code: p1info.roomCode, role: 'p2', partnerSocketId: p1SocketId, waiting: false };
  } else {
    const code = createRoom(socketId, io);
    queue.push(socketId);
    return { code, role: 'p1', waiting: true };
  }
}

function handleInput(socketId, input) {
  const info = playerMap.get(socketId);
  if (!info) return;
  const room = rooms.get(info.roomCode);
  if (!room || room.state.gameOver) return;
  const tank = room.state.players[info.role];
  if (tank) tank.input = input;
}

function handleRestart(socketId) {
  const info = playerMap.get(socketId);
  if (!info) return false;
  const room = rooms.get(info.roomCode);
  if (!room) return false;

  if (room.intervalId) {
    clearInterval(room.intervalId);
    room.intervalId = null;
  }
  const scores = { ...room.state.scores };
  room.state = createGameState();
  room.state.scores = scores;
  room.statsCommitted = false;
  room.io.to(info.roomCode).emit('maze', room.state.maze);
  startRoomLoop(room);
  return true;
}

function handleDisconnect(socketId) {
  const queueIdx = queue.indexOf(socketId);
  if (queueIdx !== -1) queue.splice(queueIdx, 1);

  const info = playerMap.get(socketId);
  if (!info) return null;
  playerMap.delete(socketId);

  const room = rooms.get(info.roomCode);
  if (!room) return null;

  if (room.intervalId) {
    clearInterval(room.intervalId);
    room.intervalId = null;
  }

  const otherRole = info.role === 'p1' ? 'p2' : 'p1';
  const otherSocketId = room.players[otherRole];

  rooms.delete(info.roomCode);
  if (otherSocketId) playerMap.delete(otherSocketId);

  return { roomCode: info.roomCode, otherSocketId };
}

function getRoomMaze(socketId) {
  const info = playerMap.get(socketId);
  if (!info) return null;
  const room = rooms.get(info.roomCode);
  return room ? room.state.maze : null;
}

export {
  createRoom,
  joinRoom,
  findOrCreateRandomRoom,
  handleInput,
  handleRestart,
  handleDisconnect,
  getRoomMaze,
  setRoomUsername,
  playerMap,
};

// Test helper — only used in tests
export function _resetForTesting() {
  rooms.clear();
  playerMap.clear();
  queue.length = 0;
}
