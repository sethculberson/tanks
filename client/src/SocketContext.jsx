import { createContext, useContext, useEffect, useRef, useState } from 'react';
import { io } from 'socket.io-client';

const SERVER_URL = import.meta.env.VITE_SERVER_URL ?? '';
const socket = io(SERVER_URL);

const SocketContext = createContext(null);

const STORAGE_KEY = 'tank_user';

function loadStoredUser() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function SocketProvider({ children }) {
  const mazeRef = useRef(null);
  const gameStateRef = useRef(null);

  const [connected, setConnected] = useState(false);
  const [role, setRole] = useState(null);
  const [roomCode, setRoomCode] = useState(null);
  const [scores, setScores] = useState({ p1: 0, p2: 0 });
  const [gameOver, setGameOver] = useState(false);
  const [winner, setWinner] = useState(null);
  const [opponentLeft, setOpponentLeft] = useState(false);
  const [lobbyError, setLobbyError] = useState(null);
  const [lobbyWaiting, setLobbyWaiting] = useState(false);
  const onMatchedRef = useRef(null);
  const onMazeRef = useRef(null);

  // Auth state
  const [currentUser, setCurrentUser] = useState(() => loadStoredUser());
  const [authError, setAuthError] = useState(null);
  const [authLoading, setAuthLoading] = useState(false);

  // Re-associate username whenever socket reconnects
  useEffect(() => {
    socket.on('connect', () => {
      setConnected(true);
      const user = loadStoredUser();
      if (user?.username) socket.emit('set_username', user.username);
    });
    socket.on('disconnect', () => setConnected(false));

    socket.on('room_created', ({ roomCode: code }) => {
      setRoomCode(code);
      setLobbyWaiting(true);
    });

    socket.on('matched', ({ roomCode: code, role: assignedRole }) => {
      setRoomCode(code);
      setRole(assignedRole);
      setLobbyWaiting(false);
      setLobbyError(null);
      onMatchedRef.current?.(code);
    });

    socket.on('maze', (maze) => {
      mazeRef.current = maze;
      setGameOver(false);
      setWinner(null);
      setOpponentLeft(false);
      onMazeRef.current?.(maze);
    });

    socket.on('gameState', (state) => {
      gameStateRef.current = state;
      if (state.scores) setScores({ ...state.scores });
      setGameOver(state.gameOver);
      setWinner(state.winner);
    });

    socket.on('join_error', ({ message }) => {
      setLobbyError(message);
      setLobbyWaiting(false);
    });

    socket.on('opponent_disconnected', () => {
      setOpponentLeft(true);
    });

    // Receive updated stats after a round ends
    socket.on('stats_updated', (updatedUser) => {
      setCurrentUser(updatedUser);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updatedUser));
    });

    return () => {
      socket.off('connect');
      socket.off('disconnect');
      socket.off('room_created');
      socket.off('matched');
      socket.off('maze');
      socket.off('gameState');
      socket.off('join_error');
      socket.off('opponent_disconnected');
      socket.off('stats_updated');
    };
  }, []);

  // Auth helpers
  async function login(username, password) {
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

  async function register(username, password) {
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

  function logout() {
    localStorage.removeItem(STORAGE_KEY);
    setCurrentUser(null);
    socket.emit('set_username', null);
  }

  const createRoom = () => {
    setLobbyError(null);
    socket.emit('create_room');
  };

  const joinRoom = (code) => {
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

  const sendInput = (input) => socket.emit('input', input);
  const restart = () => socket.emit('restart');

  const resetLobby = () => {
    setRole(null);
    setRoomCode(null);
    setLobbyWaiting(false);
    setLobbyError(null);
    setOpponentLeft(false);
    mazeRef.current = null;
    gameStateRef.current = null;
  };

  return (
    <SocketContext.Provider value={{
      connected, role, roomCode, scores, gameOver, winner,
      opponentLeft, lobbyError, lobbyWaiting,
      mazeRef, gameStateRef, onMatchedRef, onMazeRef,
      createRoom, joinRoom, randomMatch, sendInput, restart, resetLobby,
      currentUser, authError, authLoading, login, register, logout,
    }}>
      {children}
    </SocketContext.Provider>
  );
}

export function useSocket() {
  return useContext(SocketContext);
}

