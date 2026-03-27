import { createContext, useContext, useEffect, useRef, useState } from 'react';
import { io } from 'socket.io-client';

const SERVER_URL = import.meta.env.VITE_SERVER_URL ?? '';
const socket = io(SERVER_URL);

const SocketContext = createContext(null);

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

  useEffect(() => {
    socket.on('connect', () => setConnected(true));
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

    return () => {
      socket.off('connect');
      socket.off('disconnect');
      socket.off('room_created');
      socket.off('matched');
      socket.off('maze');
      socket.off('gameState');
      socket.off('join_error');
      socket.off('opponent_disconnected');
    };
  }, []);

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
    }}>
      {children}
    </SocketContext.Provider>
  );
}

export function useSocket() {
  return useContext(SocketContext);
}
