import { useEffect, useRef, useState } from 'react';
import { io } from 'socket.io-client';
import { drawGame } from './renderer';
import Lobby from './Lobby';

const SERVER_URL = import.meta.env.VITE_SERVER_URL ?? '';
const socket = io(SERVER_URL);

const CELL_SIZE = 60;

export default function App() {
  const canvasRef = useRef(null);
  const mazeRef = useRef(null);
  const gameStateRef = useRef(null);
  const keysRef = useRef({});

  const [screen, setScreen] = useState('lobby'); // 'lobby' | 'game'
  const [role, setRole] = useState(null);         // 'p1' | 'p2'
  const [roomCode, setRoomCode] = useState(null);
  const [connected, setConnected] = useState(false);
  const [scores, setScores] = useState({ p1: 0, p2: 0 });
  const [gameOver, setGameOver] = useState(false);
  const [winner, setWinner] = useState(null);
  const [lobbyError, setLobbyError] = useState(null);
  const [lobbyWaiting, setLobbyWaiting] = useState(false);
  const [opponentLeft, setOpponentLeft] = useState(false);

  // Socket events
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
    });

    socket.on('maze', (maze) => {
      mazeRef.current = maze;
      // Transition to game screen once we have maze + role
      setScreen('game');
      setGameOver(false);
      setWinner(null);
      setOpponentLeft(false);
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

  // Keyboard capture
  useEffect(() => {
    const down = (e) => {
      keysRef.current[e.code] = true;
      if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.code)) {
        e.preventDefault();
      }
    };
    const up = (e) => { keysRef.current[e.code] = false; };
    window.addEventListener('keydown', down);
    window.addEventListener('keyup', up);
    return () => { window.removeEventListener('keydown', down); window.removeEventListener('keyup', up); };
  }, []);

  // Input emission — only for own role
  useEffect(() => {
    if (screen !== 'game' || !role) return;
    const p1Keys = { up: 'KeyW', down: 'KeyS', left: 'KeyA', right: 'KeyD', shoot: 'Space' };
    const p2Keys = { up: 'ArrowUp', down: 'ArrowDown', left: 'ArrowLeft', right: 'ArrowRight', shoot: 'Enter' };
    const myKeys = role === 'p1' ? p1Keys : p2Keys;

    const interval = setInterval(() => {
      const k = keysRef.current;
      socket.emit('input', {
        up: !!k[myKeys.up],
        down: !!k[myKeys.down],
        left: !!k[myKeys.left],
        right: !!k[myKeys.right],
        shoot: !!k[myKeys.shoot],
      });
    }, 1000 / 60);
    return () => clearInterval(interval);
  }, [screen, role]);

  // Canvas render loop
  useEffect(() => {
    let animId;
    const render = () => {
      const canvas = canvasRef.current;
      if (canvas && mazeRef.current && gameStateRef.current) {
        drawGame(canvas, mazeRef.current, gameStateRef.current);
      }
      animId = requestAnimationFrame(render);
    };
    animId = requestAnimationFrame(render);
    return () => cancelAnimationFrame(animId);
  }, []);

  const handleRandomMatch = () => {
    setLobbyError(null);
    setLobbyWaiting(true);
    setRoomCode(null);
    socket.emit('random_match');
  };

  const handleCreateRoom = () => {
    setLobbyError(null);
    socket.emit('create_room');
  };

  const handleJoinRoom = (code) => {
    if (!code || code.length < 4) { setLobbyError('Please enter a 4-letter code'); return; }
    setLobbyError(null);
    socket.emit('join_room', { roomCode: code });
  };

  const handleRestart = () => {
    socket.emit('restart');
  };

  const handleBackToLobby = () => {
    setScreen('lobby');
    setRole(null);
    setRoomCode(null);
    setLobbyWaiting(false);
    setLobbyError(null);
    setOpponentLeft(false);
    mazeRef.current = null;
    gameStateRef.current = null;
  };

  const mazeWidth = mazeRef.current ? mazeRef.current.cols * CELL_SIZE : 900;
  const mazeHeight = mazeRef.current ? mazeRef.current.rows * CELL_SIZE : 660;
  const myColor = role === 'p1' ? 'olive' : 'maroon';
  const myLabel = role === 'p1' ? 'Player 1 (WASD + Space)' : 'Player 2 (Arrows + Enter)';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10 }}>

      {screen === 'lobby' && (
        <Lobby
          onRandomMatch={handleRandomMatch}
          onCreateRoom={handleCreateRoom}
          onJoinRoom={handleJoinRoom}
          error={lobbyError}
          waiting={lobbyWaiting}
          roomCode={roomCode}
        />
      )}

      {screen === 'game' && (
        <>
          <h1 style={{
            fontFamily: "'Times New Roman', Times, serif",
            fontSize: 32,
            fontWeight: 'bold',
            color: '#2c1a0e',
            letterSpacing: 2,
            borderBottom: '2px solid #5a3e28',
            paddingBottom: 6,
          }}>
            TANK TROUBLE
          </h1>

          <div style={{
            display: 'flex',
            gap: 40,
            fontSize: 16,
            fontFamily: "'Times New Roman', Times, serif",
            background: '#e8d9c4',
            border: '2px inset #a08060',
            padding: '6px 24px',
            alignItems: 'center',
          }}>
            <span><b>Player 1</b>: {scores.p1}</span>
            <span>|</span>
            <span><b>Player 2</b>: {scores.p2}</span>
            <span style={{ color: '#5a3e28', fontSize: 13 }}>— You are <b style={{ color: myColor }}>{myLabel}</b></span>
          </div>

          <div style={{ position: 'relative' }}>
            <canvas
              ref={canvasRef}
              width={mazeWidth}
              height={mazeHeight}
              style={{ border: '4px ridge #5a3e28', display: 'block' }}
            />

            {gameOver && (
              <div style={{
                position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
                background: 'rgba(200,184,154,0.88)',
                display: 'flex', flexDirection: 'column',
                alignItems: 'center', justifyContent: 'center',
                gap: 20,
                border: '4px inset #5a3e28',
              }}>
                <h2 style={{
                  fontSize: 36,
                  fontFamily: "'Times New Roman', Times, serif",
                  color: '#2c1a0e',
                  textDecoration: 'underline',
                }}>
                  {winner === role ? 'You Win!' : 'You Lose.'}
                  <br />
                  <span style={{ fontSize: 22, textDecoration: 'none' }}>
                    ({winner === 'p1' ? 'Player 1' : 'Player 2'} wins)
                  </span>
                </h2>
                <button
                  onClick={handleRestart}
                  style={{
                    padding: '8px 28px', fontSize: 16,
                    fontFamily: "'Times New Roman', Times, serif",
                    background: '#d4c4a8', color: '#2c1a0e',
                    border: '3px outset #a08060', cursor: 'pointer',
                  }}
                >
                  Play Again
                </button>
                <button
                  onClick={handleBackToLobby}
                  style={{
                    padding: '6px 20px', fontSize: 14,
                    fontFamily: "'Times New Roman', Times, serif",
                    background: '#d4c4a8', color: '#5a3e28',
                    border: '2px outset #a08060', cursor: 'pointer',
                  }}
                >
                  Back to Lobby
                </button>
              </div>
            )}

            {opponentLeft && !gameOver && (
              <div style={{
                position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
                background: 'rgba(200,184,154,0.9)',
                display: 'flex', flexDirection: 'column',
                alignItems: 'center', justifyContent: 'center',
                gap: 16,
              }}>
                <p style={{ fontFamily: "'Times New Roman', Times, serif", fontSize: 22 }}>
                  Opponent disconnected.
                </p>
                <button
                  onClick={handleBackToLobby}
                  style={{
                    padding: '8px 28px', fontSize: 16,
                    fontFamily: "'Times New Roman', Times, serif",
                    background: '#d4c4a8', color: '#2c1a0e',
                    border: '3px outset #a08060', cursor: 'pointer',
                  }}
                >
                  Back to Lobby
                </button>
              </div>
            )}

            {!connected && (
              <div style={{
                position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
                background: 'rgba(200,184,154,0.9)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <p style={{ fontSize: 20, fontFamily: "'Times New Roman', Times, serif" }}>
                  Connecting to server...
                </p>
              </div>
            )}
          </div>

          <hr style={{ width: '100%', maxWidth: mazeWidth, borderColor: '#5a3e28' }} />
          <p style={{ fontSize: 13, fontFamily: "'Times New Roman', Times, serif", color: '#5a3e28' }}>
            Room: <b>{roomCode}</b> &nbsp;&mdash;&nbsp; {myLabel}
          </p>
        </>
      )}
    </div>
  );
}
