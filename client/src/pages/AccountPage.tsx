import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSocket } from '../context/SocketContext.tsx';

export default function AccountPage() {
  const navigate = useNavigate();
  const { login, register, currentUser, authError, authLoading } = useSocket();

  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');

  // Already logged in — go straight to lobby
  if (currentUser) {
    navigate('/lobby', { replace: true });
    return null;
  }

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const ok = mode === 'login'
      ? await login(username, password)
      : await register(username, password);
    if (ok) navigate('/lobby', { replace: true });
  };

  return (
    <div className="page-center">
      <h1 className="game-title">TANK TROUBLE</h1>

      <div style={{ width: 340 }}>
        <div className="window" style={{ width: '100%' }}>
          <div className="title-bar">
            <div className="title-bar-text">
              {mode === 'login' ? 'Log In' : 'Create Account'}
            </div>
          </div>
          <div className="window-body">
            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <div>
                <label style={{ display: 'block', marginBottom: 2 }}>Username</label>
                <input
                  className="textbox"
                  type="text"
                  value={username}
                  onChange={e => setUsername(e.target.value)}
                  maxLength={20}
                  required
                  style={{ width: '100%' }}
                  autoFocus
                />
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: 2 }}>Password</label>
                <input
                  className="textbox"
                  type="password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  required
                  style={{ width: '100%' }}
                />
              </div>

              {authError && (
                <p className="error-text" style={{ margin: 0 }}>{authError}</p>
              )}

              <button type="submit" disabled={authLoading} style={{ marginTop: 4 }}>
                {authLoading ? 'Please wait...' : mode === 'login' ? 'Log In' : 'Create Account'}
              </button>
            </form>

            <hr style={{ margin: '10px 0' }} />

            {mode === 'login' ? (
              <p style={{ margin: 0, fontSize: 12 }}>
                No account?{' '}
                <button
                  style={{ padding: '0 4px', fontSize: 12 }}
                  onClick={() => { setMode('register'); }}
                >
                  Create one
                </button>
              </p>
            ) : (
              <p style={{ margin: 0, fontSize: 12 }}>
                Already have an account?{' '}
                <button
                  style={{ padding: '0 4px', fontSize: 12 }}
                  onClick={() => { setMode('login'); }}
                >
                  Log in
                </button>
              </p>
            )}
          </div>
        </div>
      </div>

      <div className="status-bar" style={{ width: 340 }}>
        <p className="status-bar-field">Tank Trouble v1.0</p>
        <p className="status-bar-field">2 Players</p>
      </div>
    </div>
  );
}
