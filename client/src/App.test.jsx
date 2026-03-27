import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Routes, Route, Navigate } from 'react-router-dom';

// Basic routing smoke test
describe('App routing', () => {
  it('redirects / to /lobby', () => {
    render(
      <MemoryRouter initialEntries={['/']}>
        <Routes>
          <Route path="/" element={<Navigate to="/lobby" replace />} />
          <Route path="/lobby" element={<div>Lobby Page</div>} />
        </Routes>
      </MemoryRouter>
    );
    expect(screen.getByText('Lobby Page')).toBeInTheDocument();
  });
});
