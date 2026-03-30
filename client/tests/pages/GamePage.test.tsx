import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import type { SocketContextValue } from '../../src/context/SocketContext.tsx';

vi.mock('../../src/context/SocketContext.tsx', () => ({
  useSocket: vi.fn(),
}));

const mockNavigate = vi.fn();
vi.mock('react-router-dom', async (importOriginal) => {
  const actual = await importOriginal<typeof import('react-router-dom')>();
  return { ...actual, useNavigate: () => mockNavigate };
});

vi.mock('../../src/lib/renderer.ts', () => ({
  drawGame: vi.fn(),
}));

import { useSocket } from '../../src/context/SocketContext.tsx';
import GamePage from '../../src/pages/GamePage.tsx';

function defaultSocketValues(overrides: Partial<SocketContextValue> = {}): SocketContextValue {
  return {
    connected: true,
    role: 'p1',
    scores: { p1: 0, p2: 0 },
    gameOver: false,
    winner: null,
    opponentLeft: false,
    mazeRef: { current: null },
    gameStateRef: { current: null },
    sendInput: vi.fn(),
    restart: vi.fn(),
    resetLobby: vi.fn(),
    ...overrides,
  } as SocketContextValue;
}

function renderGame(socketValues: Partial<SocketContextValue> = {}, gameId = 'ABCD') {
  vi.mocked(useSocket).mockReturnValue(defaultSocketValues(socketValues));
  return render(
    <MemoryRouter initialEntries={[`/game/${gameId}`]}>
      <Routes>
        <Route path="/game/:gameId" element={<GamePage />} />
        <Route path="/lobby" element={<div>Lobby</div>} />
      </Routes>
    </MemoryRouter>
  );
}

describe('GamePage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders the game title', () => {
    renderGame();
    expect(screen.getByText('TANK TROUBLE')).toBeInTheDocument();
  });

  it('shows player scores in status bar', () => {
    renderGame({ scores: { p1: 3, p2: 1 } });
    expect(screen.getByText('P1: 3')).toBeInTheDocument();
    expect(screen.getByText('P2: 1')).toBeInTheDocument();
  });

  it('shows room code in status bar', () => {
    renderGame({}, 'XYZW');
    expect(screen.getByText('Room: XYZW')).toBeInTheDocument();
  });

  it('shows P1 controls label when role is p1', () => {
    renderGame({ role: 'p1' });
    expect(screen.getByText('Player 1 — WASD + Space')).toBeInTheDocument();
  });

  it('shows P2 controls label when role is p2', () => {
    renderGame({ role: 'p2' });
    expect(screen.getByText('Player 2 — Arrows + Enter')).toBeInTheDocument();
  });

  it('redirects to /lobby if no role', () => {
    renderGame({ role: null });
    expect(mockNavigate).toHaveBeenCalledWith('/lobby', { replace: true });
  });

  it('shows game over overlay when gameOver is true', () => {
    renderGame({ gameOver: true, winner: 'p1', role: 'p1' });
    expect(screen.getByText('You Win!')).toBeInTheDocument();
  });

  it('shows lose message when opponent wins', () => {
    renderGame({ gameOver: true, winner: 'p2', role: 'p1' });
    expect(screen.getByText('You Lose.')).toBeInTheDocument();
  });

  it('shows opponent disconnected overlay', () => {
    renderGame({ opponentLeft: true, gameOver: false });
    expect(screen.getByText('Opponent disconnected.')).toBeInTheDocument();
  });

  it('shows connecting overlay when not connected', () => {
    renderGame({ connected: false });
    expect(screen.getByText('Connecting to server...')).toBeInTheDocument();
  });

  it('calls restart when Play Again is clicked', () => {
    const restart = vi.fn();
    renderGame({ gameOver: true, winner: 'p1', role: 'p1', restart });
    screen.getByText('Play Again').click();
    expect(restart).toHaveBeenCalledOnce();
  });

  it('calls resetLobby and navigates to lobby when Lobby button clicked', () => {
    const resetLobby = vi.fn();
    renderGame({ gameOver: true, winner: 'p1', role: 'p1', resetLobby });
    screen.getByText('Lobby').click();
    expect(resetLobby).toHaveBeenCalledOnce();
    expect(mockNavigate).toHaveBeenCalledWith('/lobby');
  });
});
