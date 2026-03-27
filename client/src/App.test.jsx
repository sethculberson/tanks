import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, act, fireEvent } from '@testing-library/react';

// vi.hoisted ensures mockSocket is available when vi.mock factory runs (mock is hoisted to top)
const mockSocket = vi.hoisted(() => ({
  on: vi.fn(),
  off: vi.fn(),
  emit: vi.fn(),
  connected: true,
}));

vi.mock('socket.io-client', () => ({
  default: vi.fn(() => mockSocket),
  io: vi.fn(() => mockSocket),
}));

describe('App', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders the lobby screen by default', async () => {
    const { default: App } = await import('./App.jsx');
    render(<App />);
    expect(screen.getByText('TANK TROUBLE')).toBeInTheDocument();
    expect(screen.getByText('Random Match')).toBeInTheDocument();
  });

  it('emits create_room when Create Room is clicked', async () => {
    const { default: App } = await import('./App.jsx');
    render(<App />);
    screen.getByText('Create Room').click();
    expect(mockSocket.emit).toHaveBeenCalledWith('create_room');
  });

  it('emits random_match when Find Match is clicked', async () => {
    const { default: App } = await import('./App.jsx');
    render(<App />);
    screen.getByText('Find Match').click();
    expect(mockSocket.emit).toHaveBeenCalledWith('random_match');
  });

  it('emits join_room with room code', async () => {
    const { default: App } = await import('./App.jsx');
    render(<App />);
    const input = screen.getByPlaceholderText('XXXX');
    fireEvent.change(input, { target: { value: 'ABCD' } });
    screen.getByText('Join').click();
    expect(mockSocket.emit).toHaveBeenCalledWith('join_room', { roomCode: 'ABCD' });
  });

  it('registers socket event handlers on mount', async () => {
    const { default: App } = await import('./App.jsx');
    render(<App />);
    const registeredEvents = mockSocket.on.mock.calls.map(([event]) => event);
    expect(registeredEvents).toContain('connect');
    expect(registeredEvents).toContain('disconnect');
    expect(registeredEvents).toContain('maze');
    expect(registeredEvents).toContain('gameState');
    expect(registeredEvents).toContain('matched');
    expect(registeredEvents).toContain('opponent_disconnected');
  });

  it('transitions to game screen when maze event fires', async () => {
    const { default: App } = await import('./App.jsx');
    render(<App />);

    // Simulate matched event (sets role)
    const matchedHandler = mockSocket.on.mock.calls.find(([e]) => e === 'matched')?.[1];
    act(() => matchedHandler?.({ roomCode: 'ABCD', role: 'p1' }));

    // Simulate maze event (triggers screen change)
    const mazeHandler = mockSocket.on.mock.calls.find(([e]) => e === 'maze')?.[1];
    const fakeMaze = {
      cols: 15, rows: 11,
      cells: Array.from({ length: 11 }, (_, y) =>
        Array.from({ length: 15 }, (_, x) => ({
          x, y, walls: { N: true, S: false, E: false, W: true }
        }))
      )
    };
    act(() => mazeHandler?.(fakeMaze));

    expect(screen.getAllByText(/Player 1/).length).toBeGreaterThan(0);
  });

  it('shows join error message', async () => {
    const { default: App } = await import('./App.jsx');
    render(<App />);
    const errorHandler = mockSocket.on.mock.calls.find(([e]) => e === 'join_error')?.[1];
    act(() => errorHandler?.({ message: 'Room not found' }));
    expect(screen.getByText('Room not found')).toBeInTheDocument();
  });
});
