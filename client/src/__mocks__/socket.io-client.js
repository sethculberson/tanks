import { vi } from 'vitest';

const mockSocket = {
  on: vi.fn(),
  off: vi.fn(),
  emit: vi.fn(),
  connected: true,
};

const io = vi.fn(() => mockSocket);

export { io as default, mockSocket };
