import { createGameState, updateGameState } from './gameState.js';
import type { GameState, PlayerId, PlayerInput, RoundStats } from './gameState.js';
import { updateUserStats, getUser } from '../services/userService.js';
import type { Server } from 'socket.io';

// roomCode -> Room
const rooms = new Map<string, Room>();
// socketId -> PlayerInfo
const playerMap = new Map<string, PlayerInfo>();
// random match queue: array of socketIds waiting
const queue: string[] = [];

const TICK_RATE = 60;

interface Room {
  code: string;
  state: GameState;
  players: Partial<Record<PlayerId, string | null>>;
  usernames: Partial<Record<PlayerId, string | null>>;
  maxPlayers: number;
  io: Server;
  intervalId: ReturnType<typeof setInterval> | null;
  lastTime: number;
  statsCommitted: boolean;
}

interface PlayerInfo {
  roomCode: string;
  role: PlayerId;
}

interface MatchResult {
  code: string;
  role: PlayerId;
  waiting: boolean;
  partnerSocketId?: string;
  error?: string;
}

interface DisconnectResult {
  roomCode: string;
  otherSocketIds: string[];
}

function generateRoomCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ'; // no I or O (ambiguous)
  let code: string;
  do {
    code = Array.from({ length: 4 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
  } while (rooms.has(code));
  return code;
}

function serializeState(state: GameState) {
  return {
    players: state.players,
    bullets: state.bullets,
    scores: state.scores,
    gameOver: state.gameOver,
    winner: state.winner,
  };
}

function startRoomLoop(room: Room): void {
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

async function commitRoundStats(room: Room): Promise<void> {
  const { winner, roundStats } = room.state;
  const tasks: Promise<void>[] = [];

  for (const role of Object.keys(room.players) as PlayerId[]) {
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
  for (const role of Object.keys(room.players) as PlayerId[]) {
    const socketId = room.players[role];
    const username = room.usernames[role];
    if (!socketId || !username) continue;
    const result = await getUser(username);
    if ('success' in result) {
      room.io.to(socketId).emit('stats_updated', result.user);
    }
  }
}

function setRoomUsername(socketId: string, username: string | null): void {
  const info = playerMap.get(socketId);
  if (!info) return;
  const room = rooms.get(info.roomCode);
  if (!room) return;
  room.usernames[info.role] = username ? username.toLowerCase().trim() : null;
}

function createRoom(p1SocketId: string, io: Server, maxPlayers: number = 2): string {
  const code = generateRoomCode();

  const players: Partial<Record<PlayerId, string | null>> = {};
  const usernames: Partial<Record<PlayerId, string | null>> = {};
  for (let i = 1; i <= maxPlayers; i++) {
    const id = `p${i}` as PlayerId;
    players[id] = i === 1 ? p1SocketId : null;
    usernames[id] = null;
  }

  const room: Room = {
    code,
    state: createGameState(maxPlayers),
    players,
    usernames,
    maxPlayers,
    io,
    intervalId: null,
    lastTime: Date.now(),
    statsCommitted: false,
  };
  rooms.set(code, room);
  playerMap.set(p1SocketId, { roomCode: code, role: 'p1' });
  return code;
}

// Returns the role assigned to the joiner, whether the room is now full, and current player count.
function joinRoom(code: string, socketId: string, io: Server): { success: true; role: PlayerId; isFull: boolean; currentPlayers: number } | { error: string } {
  const room = rooms.get(code);
  if (!room) return { error: 'Room not found' };

  const allRoles = Array.from({ length: room.maxPlayers }, (_, i) => `p${i + 1}` as PlayerId);
  const nextRole = allRoles.find(r => room.players[r] === null);
  if (!nextRole) return { error: 'Room is full' };

  room.players[nextRole] = socketId;
  playerMap.set(socketId, { roomCode: code, role: nextRole });

  const currentPlayers = allRoles.filter(r => room.players[r] !== null).length;
  const isFull = currentPlayers === room.maxPlayers;
  if (isFull) startRoomLoop(room);

  return { success: true, role: nextRole, isFull, currentPlayers };
}

function findOrCreateRandomRoom(socketId: string, io: Server): MatchResult {
  // Drain stale entries from queue
  while (queue.length > 0 && !playerMap.has(queue[0])) {
    queue.shift();
  }

  if (queue.length > 0) {
    const p1SocketId = queue.shift()!;
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

function handleInput(socketId: string, input: PlayerInput): void {
  const info = playerMap.get(socketId);
  if (!info) return;
  const room = rooms.get(info.roomCode);
  if (!room || room.state.gameOver) return;
  const tank = room.state.players[info.role];
  if (tank) tank.input = input;
}

function handleRestart(socketId: string): boolean {
  const info = playerMap.get(socketId);
  if (!info) return false;
  const room = rooms.get(info.roomCode);
  if (!room) return false;

  if (room.intervalId) {
    clearInterval(room.intervalId);
    room.intervalId = null;
  }
  const scores = { ...room.state.scores };
  room.state = createGameState(room.maxPlayers);
  room.state.scores = scores;
  room.statsCommitted = false;
  room.io.to(info.roomCode).emit('maze', room.state.maze);
  startRoomLoop(room);
  return true;
}

function handleDisconnect(socketId: string): DisconnectResult | null {
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

  const otherSocketIds: string[] = (Object.values(room.players) as (string | null)[])
    .filter((sid): sid is string => sid !== null && sid !== socketId);

  rooms.delete(info.roomCode);
  for (const sid of otherSocketIds) playerMap.delete(sid);

  return { roomCode: info.roomCode, otherSocketIds };
}

function getRoomMaze(socketId: string) {
  const info = playerMap.get(socketId);
  if (!info) return null;
  const room = rooms.get(info.roomCode);
  return room ? room.state.maze : null;
}

function getRoomPlayers(code: string): Partial<Record<PlayerId, string | null>> {
  return rooms.get(code)?.players ?? {};
}

function getRoomMaxPlayers(code: string): number {
  return rooms.get(code)?.maxPlayers ?? 2;
}

export {
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
};

// Test helper — only used in tests
export function _resetForTesting(): void {
  rooms.clear();
  playerMap.clear();
  queue.length = 0;
}
