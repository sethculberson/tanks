import { vi } from 'vitest';

export const mockSocket = {
  on: vi.fn(),
  off: vi.fn(),
  emit: vi.fn(),
  connected: true,
};

const io = vi.fn(() => mockSocket);

export default io;
