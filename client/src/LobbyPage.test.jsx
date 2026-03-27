import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

// Mock useSocket
vi.mock('./SocketContext', () => ({
  useSocket: vi.fn(),
}));
// Mock useNavigate
const mockNavigate = vi.fn();
vi.mock('react-router-dom', async (importOriginal) => {
  const actual = await importOriginal();
  return { ...actual, useNavigate: () => mockNavigate };
});

import { useSocket } from './SocketContext';
import LobbyPage from './LobbyPage';

function defaultSocketValues(overrides = {}) {
  return {
    lobbyError: null,
    lobbyWaiting: false,
    roomCode: null,
    createRoom: vi.fn(),
    joinRoom: vi.fn(),
    randomMatch: vi.fn(),
    onMatchedRef: { current: null },
    ...overrides,
  };
}

function renderLobby(socketValues = {}) {
  useSocket.mockReturnValue(defaultSocketValues(socketValues));
  return render(
    <MemoryRouter>
      <LobbyPage />
    </MemoryRouter>
  );
}

describe('LobbyPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders the game title', () => {
    renderLobby();
    expect(screen.getByText('TANK TROUBLE')).toBeInTheDocument();
  });

  it('renders all three sections', () => {
    renderLobby();
    expect(screen.getByText('Random Match')).toBeInTheDocument();
    expect(screen.getByText('Create Private Room')).toBeInTheDocument();
    expect(screen.getByText('Join with Code')).toBeInTheDocument();
  });

  it('calls randomMatch when Find Match is clicked', () => {
    const randomMatch = vi.fn();
    renderLobby({ randomMatch });
    fireEvent.click(screen.getByText('Find Match'));
    expect(randomMatch).toHaveBeenCalledOnce();
  });

  it('shows searching text when waiting without roomCode', () => {
    renderLobby({ lobbyWaiting: true, roomCode: null });
    expect(screen.getByText('Searching for opponent...')).toBeInTheDocument();
  });

  it('hides Find Match button while waiting', () => {
    renderLobby({ lobbyWaiting: true, roomCode: null });
    expect(screen.queryByText('Find Match')).not.toBeInTheDocument();
  });

  it('calls createRoom when Create Room is clicked', () => {
    const createRoom = vi.fn();
    renderLobby({ createRoom });
    fireEvent.click(screen.getByText('Create Room'));
    expect(createRoom).toHaveBeenCalledOnce();
  });

  it('shows room code when roomCode is set', () => {
    renderLobby({ roomCode: 'ABCD' });
    expect(screen.getByText('ABCD')).toBeInTheDocument();
  });

  it('shows waiting message when room is created', () => {
    renderLobby({ roomCode: 'ABCD' });
    expect(screen.getByText('Waiting for opponent to join...')).toBeInTheDocument();
  });

  it('hides Create Room button when roomCode is set', () => {
    renderLobby({ roomCode: 'ABCD' });
    expect(screen.queryByText('Create Room')).not.toBeInTheDocument();
  });

  it('calls joinRoom when Join is clicked', () => {
    const joinRoom = vi.fn();
    renderLobby({ joinRoom });
    fireEvent.change(screen.getByPlaceholderText('XXXX'), { target: { value: 'ABCD' } });
    fireEvent.click(screen.getByText('Join'));
    expect(joinRoom).toHaveBeenCalledWith('ABCD');
  });

  it('uppercases typed room code input', () => {
    renderLobby();
    const input = screen.getByPlaceholderText('XXXX');
    fireEvent.change(input, { target: { value: 'abcd' } });
    expect(input.value).toBe('ABCD');
  });

  it('displays error message', () => {
    renderLobby({ lobbyError: 'Room not found' });
    expect(screen.getByText('Room not found')).toBeInTheDocument();
  });

  it('navigates to /game/:code when onMatchedRef fires', () => {
    const onMatchedRef = { current: null };
    renderLobby({ onMatchedRef });
    // Simulate server calling back with room code
    onMatchedRef.current?.('XYZW');
    expect(mockNavigate).toHaveBeenCalledWith('/game/XYZW');
  });
});
