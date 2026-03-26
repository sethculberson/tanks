import { useEffect, useRef, useState } from 'react';
import { io } from 'socket.io-client';
import { drawGame } from './renderer';

const socket = io();

export default function App() {
  const canvasRef = useRef(null);
  const mazeRef = useRef(null);
  const gameStateRef = useRef(null);
  const keysRef = useRef({});
  const [connected, setConnected] = useState(false);
  const [scores, setScores] = useState({ p1: 0, p2: 0 });
  const [gameOver, setGameOver] = useState(false);
  const [winner, setWinner] = useState(null);

  useEffect(() => {
    socket.on('connect', () => setConnected(true));
    socket.on('disconnect', () => setConnected(false));

    socket.on('maze', (maze) => {
      mazeRef.current = maze;
    });

    socket.on('gameState', (state) => {
      gameStateRef.current = state;
      if (state.scores) setScores({ ...state.scores });
      setGameOver(state.gameOver);
      setWinner(state.winner);
    });

    return () => {
      socket.off('connect');
      socket.off('disconnect');
      socket.off('maze');
      socket.off('gameState');
    };
  }, []);

  // Input handling
  useEffect(() => {
    const handleKeyDown = (e) => {
      keysRef.current[e.code] = true;
      if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.code)) {
        e.preventDefault();
      }
    };
    const handleKeyUp = (e) => {
      keysRef.current[e.code] = false;
    };
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, []);

  // Input emission loop
  useEffect(() => {
    const interval = setInterval(() => {
      const keys = keysRef.current;
      socket.emit('input', {
        playerId: 'p1',
        input: {
          up: !!keys['KeyW'],
          down: !!keys['KeyS'],
          left: !!keys['KeyA'],
          right: !!keys['KeyD'],
          shoot: !!keys['Space'],
        },
      });
      socket.emit('input', {
        playerId: 'p2',
        input: {
          up: !!keys['ArrowUp'],
          down: !!keys['ArrowDown'],
          left: !!keys['ArrowLeft'],
          right: !!keys['ArrowRight'],
          shoot: !!keys['Enter'],
        },
      });
    }, 1000 / 60);
    return () => clearInterval(interval);
  }, []);

  // Render loop
  useEffect(() => {
    let animFrameId;
    const render = () => {
      const canvas = canvasRef.current;
      if (canvas && mazeRef.current && gameStateRef.current) {
        drawGame(canvas, mazeRef.current, gameStateRef.current);
      }
      animFrameId = requestAnimationFrame(render);
    };
    animFrameId = requestAnimationFrame(render);
    return () => cancelAnimationFrame(animFrameId);
  }, []);

  const handleRestart = () => {
    socket.emit('restart');
    setGameOver(false);
    setWinner(null);
  };

  const CELL_SIZE = 60;
  const mazeWidth = mazeRef.current ? mazeRef.current.cols * CELL_SIZE : 900;
  const mazeHeight = mazeRef.current ? mazeRef.current.rows * CELL_SIZE : 660;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10 }}>

      {/* Page title — plain early-web header */}
      <h1 style={{
        fontFamily: "'Times New Roman', Times, serif",
        fontSize: 32,
        fontWeight: 'bold',
        color: '#2c1a0e',
        letterSpacing: 2,
        borderBottom: '2px solid #5a3e28',
        paddingBottom: 6,
        marginBottom: 4,
      }}>
        TANK TROUBLE
      </h1>

      {/* Scores — plain table-like row */}
      <div style={{
        display: 'flex',
        gap: 40,
        fontSize: 16,
        fontFamily: "'Times New Roman', Times, serif",
        background: '#e8d9c4',
        border: '2px inset #a08060',
        padding: '6px 24px',
      }}>
        <span><b>Player 1</b> (WASD + Space): <b>{scores.p1}</b></span>
        <span>|</span>
        <span><b>Player 2</b> (Arrows + Enter): <b>{scores.p2}</b></span>
      </div>

      <div style={{ position: 'relative' }}>
        <canvas
          ref={canvasRef}
          width={mazeWidth}
          height={mazeHeight}
          style={{
            border: '4px ridge #5a3e28',
            display: 'block',
          }}
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
              {winner === 'p1' ? 'Player 1 Wins!' : 'Player 2 Wins!'}
            </h2>
            <button
              onClick={handleRestart}
              style={{
                padding: '8px 28px',
                fontSize: 16,
                fontFamily: "'Times New Roman', Times, serif",
                background: '#d4c4a8',
                color: '#2c1a0e',
                border: '3px outset #a08060',
                cursor: 'pointer',
              }}
            >
              Play Again
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
        P1: WASD to move, Space to shoot &nbsp;&mdash;&nbsp; P2: Arrow keys to move, Enter to shoot
      </p>
    </div>
  );
}
