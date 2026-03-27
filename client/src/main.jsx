import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { SocketProvider } from './SocketContext'
import AccountPage from './AccountPage'
import LobbyPage from './LobbyPage'
import GamePage from './GamePage'
import './index.css'

function RequireAuth({ children }) {
  const stored = localStorage.getItem('tank_user');
  return stored ? children : <Navigate to="/account" replace />;
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <SocketProvider>
        <Routes>
          <Route path="/account" element={<AccountPage />} />
          <Route path="/" element={<Navigate to="/lobby" replace />} />
          <Route path="/lobby" element={<RequireAuth><LobbyPage /></RequireAuth>} />
          <Route path="/game/:gameId" element={<RequireAuth><GamePage /></RequireAuth>} />
        </Routes>
      </SocketProvider>
    </BrowserRouter>
  </React.StrictMode>,
)
