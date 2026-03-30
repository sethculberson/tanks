import { useEffect, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useSocket } from '../context/SocketContext.tsx';
import type { PlayerInput, PlayerId } from '../context/SocketContext.tsx';
import { drawGame } from '../lib/renderer.ts';

const CELL_SIZE = 60;

export default function GamePage() {
  const { gameId } = useParams<{ gameId: string }>();
  const navigate = useNavigate();
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const keysRef = useRef<Record<string, boolean>>({});

  const {
    connected, role, scores, gameOver, winner,
    opponentLeft, mazeRef, gameStateRef,
    sendInput, restart, resetLobby,
  } = useSocket();

  // Redirect if no role (direct URL visit or page refresh)
  useEffect(() => {
    if (!role) {
      navigate('/lobby', { replace: true });
    }
  }, [role, navigate]);

  // Keyboard capture
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      keysRef.current[e.code] = true;
      if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.code)) {
        e.preventDefault();
      }
    };
    const up = (e: KeyboardEvent) => { keysRef.current[e.code] = false; };
    window.addEventListener('keydown', down);
    window.addEventListener('keyup', up);
    return () => { window.removeEventListener('keydown', down); window.removeEventListener('keyup', up); };
  }, []);

  // Input emission — only for own role
  useEffect(() => {
    if (!role) return;
    const p1Keys = { up: 'KeyW', down: 'KeyS', left: 'KeyA', right: 'KeyD', shoot: 'Space' };
    const p2Keys = { up: 'ArrowUp', down: 'ArrowDown', left: 'ArrowLeft', right: 'ArrowRight', shoot: 'Enter' };
    const myKeys = role === 'p1' ? p1Keys : p2Keys;

    const interval = setInterval(() => {
      const k = keysRef.current;
      sendInput({
        up: !!k[myKeys.up],
        down: !!k[myKeys.down],
        left: !!k[myKeys.left],
        right: !!k[myKeys.right],
        shoot: !!k[myKeys.shoot],
      } as PlayerInput);
    }, 1000 / 60);
    return () => clearInterval(interval);
  }, [role, sendInput]);

  // Canvas render loop
  useEffect(() => {
    let animId: number;
    const render = () => {
      const canvas = canvasRef.current;
      if (canvas && mazeRef.current && gameStateRef.current) {
        drawGame(canvas, mazeRef.current, gameStateRef.current);
      }
      animId = requestAnimationFrame(render);
    };
    animId = requestAnimationFrame(render);
    return () => cancelAnimationFrame(animId);
  }, [mazeRef, gameStateRef]);

  const handleBackToLobby = () => {
    resetLobby();
    navigate('/lobby');
  };

  const mazeWidth = mazeRef.current ? mazeRef.current.cols * CELL_SIZE : 900;
  const mazeHeight = mazeRef.current ? mazeRef.current.rows * CELL_SIZE : 660;
  const myLabel = role === 'p1' ? 'Player 1 — WASD + Space' : 'Player 2 — Arrows + Enter';

  return (
    <div className="page-center">
      <h1 className="game-title">TANK TROUBLE</h1>

      {/* Score bar */}
      <div className="status-bar" style={{ width: mazeWidth }}>
        <p className="status-bar-field">P1: {scores.p1}</p>
        <p className="status-bar-field">P2: {scores.p2}</p>
        <p className="status-bar-field">Room: {gameId}</p>
        <p className="status-bar-field">{myLabel}</p>
      </div>

      {/* Canvas */}
      <div style={{ position: 'relative' }}>
        <canvas
          ref={canvasRef}
          width={mazeWidth}
          height={mazeHeight}
          className="canvas-border"
        />

        {/* Game over overlay */}
        {gameOver && (
          <div className="canvas-overlay">
            <div className="window" style={{ width: 300 }}>
              <div className="title-bar">
                <div className="title-bar-text">
                  {winner === role ? 'Victory!' : 'Defeated'}
                </div>
              </div>
              <div className="window-body" style={{ textAlign: 'center', gap: 10, display: 'flex', flexDirection: 'column' }}>
                <h2 style={{ fontSize: 24, marginBottom: 8 }}>
                  {winner === role ? 'You Win!' : 'You Lose.'}
                  <br />
                  <small style={{ fontSize: 14 }}>
                    ({winner === 'p1' ? 'Player 1' : 'Player 2'} wins)
                  </small>
                </h2>
                <div style={{ display: 'flex', gap: 8, justifyContent: 'center' }}>
                  <button onClick={restart}>Play Again</button>
                  <button onClick={handleBackToLobby}>Lobby</button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Opponent disconnected overlay */}
        {opponentLeft && !gameOver && (
          <div className="canvas-overlay">
            <div className="window" style={{ width: 280 }}>
              <div className="title-bar">
                <div className="title-bar-text">Disconnected</div>
              </div>
              <div className="window-body" style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', gap: 10 }}>
                <p>Opponent disconnected.</p>
                <button onClick={handleBackToLobby}>Back to Lobby</button>
              </div>
            </div>
          </div>
        )}

        {/* Connecting overlay */}
        {!connected && (
          <div className="canvas-overlay">
            <div className="window" style={{ width: 240 }}>
              <div className="title-bar">
                <div className="title-bar-text">Please Wait</div>
              </div>
              <div className="window-body">
                <p>Connecting to server...</p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
