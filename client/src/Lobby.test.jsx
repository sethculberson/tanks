import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import Lobby from './Lobby';

describe('Lobby', () => {
  const defaultProps = {
    onRandomMatch: vi.fn(),
    onCreateRoom: vi.fn(),
    onJoinRoom: vi.fn(),
    error: null,
    waiting: false,
    roomCode: null,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders the title', () => {
    render(<Lobby {...defaultProps} />);
    expect(screen.getByText('TANK TROUBLE')).toBeInTheDocument();
  });

  it('renders all three sections', () => {
    render(<Lobby {...defaultProps} />);
    expect(screen.getByText('Random Match')).toBeInTheDocument();
    expect(screen.getByText('Create Private Room')).toBeInTheDocument();
    expect(screen.getByText('Join with Code')).toBeInTheDocument();
  });

  it('calls onRandomMatch when Find Match is clicked', () => {
    render(<Lobby {...defaultProps} />);
    fireEvent.click(screen.getByText('Find Match'));
    expect(defaultProps.onRandomMatch).toHaveBeenCalledOnce();
  });

  it('shows searching text when waiting without roomCode', () => {
    render(<Lobby {...defaultProps} waiting={true} roomCode={null} />);
    expect(screen.getByText('Searching for opponent...')).toBeInTheDocument();
  });

  it('calls onCreateRoom when Create Room is clicked', () => {
    render(<Lobby {...defaultProps} />);
    fireEvent.click(screen.getByText('Create Room'));
    expect(defaultProps.onCreateRoom).toHaveBeenCalledOnce();
  });

  it('shows room code and waiting message when roomCode is set', () => {
    render(<Lobby {...defaultProps} roomCode="ABCD" />);
    expect(screen.getByText('ABCD')).toBeInTheDocument();
    expect(screen.getByText('Waiting for opponent to join...')).toBeInTheDocument();
  });

  it('hides Create Room button when roomCode is set', () => {
    render(<Lobby {...defaultProps} roomCode="ABCD" />);
    expect(screen.queryByText('Create Room')).not.toBeInTheDocument();
  });

  it('calls onJoinRoom with typed code when Join is clicked', () => {
    render(<Lobby {...defaultProps} />);
    const input = screen.getByPlaceholderText('XXXX');
    fireEvent.change(input, { target: { value: 'ABCD' } });
    fireEvent.click(screen.getByText('Join'));
    expect(defaultProps.onJoinRoom).toHaveBeenCalledWith('ABCD');
  });

  it('uppercases typed room code', () => {
    render(<Lobby {...defaultProps} />);
    const input = screen.getByPlaceholderText('XXXX');
    fireEvent.change(input, { target: { value: 'abcd' } });
    expect(input.value).toBe('ABCD');
  });

  it('displays error message when error prop is set', () => {
    render(<Lobby {...defaultProps} error="Room not found" />);
    expect(screen.getByText('Room not found')).toBeInTheDocument();
  });

  it('does not display error when error is null', () => {
    render(<Lobby {...defaultProps} error={null} />);
    expect(screen.queryByText('Room not found')).not.toBeInTheDocument();
  });
});
