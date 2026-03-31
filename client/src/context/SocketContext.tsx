import { createContext, useContext, useEffect, useRef, useState } from 'react';
import { io } from 'socket.io-client';

const SERVER_URL = import.meta.env.VITE_SERVER_URL ?? '';
const socket = io(SERVER_URL);

// ── Shared types ──────────────────────────────────────────────────────────────

export type PlayerId = 'p1' | 'p2' | 'p3' | 'p4' | 'p5' | 'p6';

export interface PlayerInput {
  up: boolean;
  down: boolean;
  left: boolean;
  right: boolean;
  shoot: boolean;
}

export interface MazeCell {
  x: number;
  y: number;
  walls: { N: boolean; S: boolean; E: boolean; W: boolean };
}

export interface Maze {
  cells: MazeCell[][];
  cols: number;
  rows: number;
}

export interface TankState {
  x: number;
  y: number;
  angle: number;
  alive: boolean;
}

export interface BulletState {
  id: string;
  owner: string;
  x: number;
  y: number;
}

export interface SerializedGameState {
  players: Record<string, TankState>;
  bullets: BulletState[];
  scores: Record<string, number>;
  gameOver: boolean;
  winner: string | null;
}

export interface UserStats {
  totalGames: number;
  totalWins: number;
  totalLosses: number;
  shotsFired: number;
  shotsHit: number;
  shotsSelf: number;
  shotsExpired: number;
}

export interface User {
  username: string;
  stats?: UserStats;
}

export interface SocketContextValue {
  connected: boolean;
  role: PlayerId | null;
  roomCode: string | null;
  scores: Record<string, number>;
  gameOver: boolean;
  winner: string | null;
  opponentLeft: boolean;
  lobbyError: string | null;
  lobbyWaiting: boolean;
  lobbyPlayerCount: { current: number; max: number } | null;
  mazeRef: React.MutableRefObject<Maze | null>;
  gameStateRef: React.MutableRefObject<SerializedGameState | null>;
  onMatchedRef: React.MutableRefObject<((code: string) => void) | null>;
  onMazeRef: React.MutableRefObject<((maze: Maze) => void) | null>;
  createRoom: (maxPlayers?: number) => void;
  joinRoom: (code: string) => void;
  randomMatch: () => void;
  sendInput: (input: PlayerInput) => void;
  restart: () => void;
  resetLobby: () => void;
  currentUser: User | null;
  authError: string | null;
  authLoading: boolean;
  login: (username: string, password: string) => Promise<boolean>;
  register: (username: string, password: string) => Promise<boolean>;
  logout: () => void;
}

// ─────────────────────────────────────────────────────────────────────────────

const SocketContext = createContext<SocketContextValue | null>(null);

const STORAGE_KEY = 'tank_user';

function loadStoredUser(): User | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function SocketProvider({ children }: { children: React.ReactNode }) {
  const mazeRef = useRef<Maze | null>(null);
  const gameStateRef = useRef<SerializedGameState | null>(null);

  const [connected, setConnected] = useState(false);
  const [role, setRole] = useState<PlayerId | null>(null);
  const [roomCode, setRoomCode] = useState<string | null>(null);
  const [scores, setScores] = useState<Record<string, number>>({ p1: 0, p2: 0 });
  const [gameOver, setGameOver] = useState(false);
  const [winner, setWinner] = useState<string | null>(null);
  const [opponentLeft, setOpponentLeft] = useState(false);
  const [lobbyError, setLobbyError] = useState<string | null>(null);
  const [lobbyWaiting, setLobbyWaiting] = useState(false);
  const [lobbyPlayerCount, setLobbyPlayerCount] = useState<{ current: number; max: number } | null>(null);
  const onMatchedRef = useRef<((code: string) => void) | null>(null);
  const onMazeRef = useRef<((maze: Maze) => void) | null>(null);

  // Auth state
  const [currentUser, setCurrentUser] = useState<User | null>(() => loadStoredUser());
  const [authError, setAuthError] = useState<string | null>(null);
  const [authLoading, setAuthLoading] = useState(false);

  // Re-associate username whenever socket reconnects
  useEffect(() => {
    socket.on('connect', () => {
      setConnected(true);
      const user = loadStoredUser();
      if (user?.username) socket.emit('set_username', user.username);
    });
    socket.on('disconnect', () => setConnected(false));

    socket.on('room_created', ({ roomCode: code, maxPlayers }: { roomCode: string; maxPlayers: number }) => {
      setRoomCode(code);
      setLobbyWaiting(true);
      setLobbyPlayerCount({ current: 1, max: maxPlayers });
    });

    socket.on('room_joined', ({ roomCode: code, role: assignedRole, current, max }: { roomCode: string; role: PlayerId; current: number; max: number }) => {
      setRoomCode(code);
      setRole(assignedRole);
      setLobbyWaiting(true);
      setLobbyError(null);
      setLobbyPlayerCount({ current, max });
    });

    socket.on('lobby_update', ({ current, max }: { current: number; max: number }) => {
      setLobbyPlayerCount({ current, max });
    });

    socket.on('matched', ({ roomCode: code, role: assignedRole }: { roomCode: string; role: PlayerId }) => {
      setRoomCode(code);
      setRole(assignedRole);
      setLobbyWaiting(false);
      setLobbyError(null);
      setLobbyPlayerCount(null);
      onMatchedRef.current?.(code);
    });

    socket.on('maze', (maze: Maze) => {
      mazeRef.current = maze;
      setGameOver(false);
      setWinner(null);
      setOpponentLeft(false);
      onMazeRef.current?.(maze);
    });

    socket.on('gameState', (state: SerializedGameState) => {
      gameStateRef.current = state;
      if (state.scores) setScores({ ...state.scores });
      setGameOver(state.gameOver);
      setWinner(state.winner);
    });
    socket.on('join_error', ({ message }: { message: string }) => {
      setLobbyError(message);
      setLobbyWaiting(false);
    });

    socket.on('opponent_disconnected', () => {
      setOpponentLeft(true);
    });

    // Receive updated stats after a round ends
    socket.on('stats_updated', (updatedUser: User) => {
      setCurrentUser(updatedUser);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updatedUser));
    });

    return () => {
      socket.off('connect');
      socket.off('disconnect');
      socket.off('room_created');
      socket.off('room_joined');
      socket.off('lobby_update');
      socket.off('matched');
      socket.off('maze');
      socket.off('gameState');
      socket.off('join_error');
      socket.off('opponent_disconnected');
      socket.off('stats_updated');
    };
  }, []);

  // Auth helpers
  async function login(username: string, password: string): Promise<boolean> {
    setAuthLoading(true);
    setAuthError(null);
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });
      const data = await res.json();
      if (!res.ok) { setAuthError(data.error); return false; }
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data.user));
      setCurrentUser(data.user);
      socket.emit('set_username', data.user.username);
      return true;
    } catch {
      setAuthError('Network error — could not reach server');
      return false;
    } finally {
      setAuthLoading(false);
    }
  }

  async function register(username: string, password: string): Promise<boolean> {
    setAuthLoading(true);
    setAuthError(null);
    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });
      const data = await res.json();
      if (!res.ok) { setAuthError(data.error); return false; }
      // Auto-login after registration
      return await login(username, password);
    } catch {
      setAuthError('Network error — could not reach server');
      return false;
    } finally {
      setAuthLoading(false);
    }
  }

  function logout(): void {
    localStorage.removeItem(STORAGE_KEY);
    setCurrentUser(null);
    socket.emit('set_username', null);
  }

  const createRoom = (maxPlayers: number = 2) => {
    setLobbyError(null);
    socket.emit('create_room', { maxPlayers });
  };

  const joinRoom = (code: string) => {
    if (!code || code.length < 4) { setLobbyError('Please enter a 4-letter code'); return; }
    setLobbyError(null);
    socket.emit('join_room', { roomCode: code });
  };

  const randomMatch = () => {
    setLobbyError(null);
    setLobbyWaiting(true);
    setRoomCode(null);
    socket.emit('random_match');
  };

  const sendInput = (input: PlayerInput) => socket.emit('input', input);
  const restart = () => socket.emit('restart');

  const resetLobby = () => {
    setRole(null);
    setRoomCode(null);
    setLobbyWaiting(false);
    setLobbyError(null);
    setLobbyPlayerCount(null);
    setOpponentLeft(false);
    mazeRef.current = null;
    gameStateRef.current = null;
  };

  return (
    <SocketContext.Provider value={{
      connected, role, roomCode, scores, gameOver, winner,
      opponentLeft, lobbyError, lobbyWaiting, lobbyPlayerCount,
      mazeRef, gameStateRef, onMatchedRef, onMazeRef,
      createRoom, joinRoom, randomMatch, sendInput, restart, resetLobby,
      currentUser, authError, authLoading, login, register, logout,
    }}>
      {children}
    </SocketContext.Provider>
  );
}

export function useSocket(): SocketContextValue {
  const ctx = useContext(SocketContext);
  if (!ctx) throw new Error('useSocket must be used within SocketProvider');
  return ctx;
}

