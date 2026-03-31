import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSocket } from '../context/SocketContext.tsx';

export default function LobbyPage() {
  const navigate = useNavigate();
  const {
    lobbyError, lobbyWaiting, roomCode, lobbyPlayerCount,
    createRoom, joinRoom, randomMatch,
    onMatchedRef, currentUser, logout,
  } = useSocket();

  const [codeInput, setCodeInput] = useState('');
  const [showStats, setShowStats] = useState(false);
  const [maxPlayers, setMaxPlayers] = useState(2);

  // Navigate to game when matched
  useState(() => {
    onMatchedRef.current = (code: string) => {
      navigate(`/game/${code}`);
    };
    return () => { onMatchedRef.current = null; };
  });

  const handleJoin = () => {
    joinRoom(codeInput);
  };

  const handleLogout = () => {
    logout();
    navigate('/account', { replace: true });
  };

  const s = currentUser?.stats;
  const accuracy = s?.shotsFired != null && s.shotsFired > 0
    ? ((s.shotsHit / s.shotsFired) * 100).toFixed(1)
    : '—';

  return (
    <div className="page-center">
      <h1 className="game-title">TANK TROUBLE</h1>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 10, width: 340 }}>

        {/* Account banner */}
        {currentUser && (
          <div className="window" style={{ width: '100%' }}>
            <div className="title-bar">
              <div className="title-bar-text">Account — {currentUser.username}</div>
            </div>
            <div className="window-body" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <button onClick={() => setShowStats(v => !v)}>
                {showStats ? 'Hide Stats' : 'Show Stats'}
              </button>
              <button onClick={handleLogout}>Log Out</button>
            </div>
            {showStats && s && (
              <div className="window-body" style={{ paddingTop: 0 }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                  <tbody>
                    <tr><td>Games Played</td><td align="right">{s.totalGames}</td></tr>
                    <tr><td>Wins</td><td align="right">{s.totalWins}</td></tr>
                    <tr><td>Losses</td><td align="right">{s.totalLosses}</td></tr>
                    <tr><td>Shots Fired</td><td align="right">{s.shotsFired}</td></tr>
                    <tr><td>Shots Hit (opponent)</td><td align="right">{s.shotsHit}</td></tr>
                    <tr><td>Shots Hit (self)</td><td align="right">{s.shotsSelf}</td></tr>
                    <tr><td>Shots Missed</td><td align="right">{s.shotsExpired}</td></tr>
                    <tr><td>Accuracy</td><td align="right">{accuracy}%</td></tr>
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* Random Match */}
        <div className="window" style={{ width: '100%' }}>
          <div className="title-bar">
            <div className="title-bar-text">Random Match</div>
          </div>
          <div className="window-body">
            <p style={{ marginBottom: 8 }}>Get paired with a random opponent.</p>
            {lobbyWaiting && !roomCode ? (
              <p><em>Searching for opponent...</em></p>
            ) : (
              <button onClick={randomMatch}>Find Match</button>
            )}
          </div>
        </div>

        {/* Create Room */}
        <div className="window" style={{ width: '100%' }}>
          <div className="title-bar">
            <div className="title-bar-text">Create Private Room</div>
          </div>
          <div className="window-body">
            <p style={{ marginBottom: 8 }}>Share the code with a friend.</p>
            {roomCode ? (
              <>
                <p style={{ marginBottom: 4 }}>Your room code:</p>
                <p className="room-code">{roomCode}</p>
                <p><em>
                  {lobbyPlayerCount
                    ? `Waiting for players... (${lobbyPlayerCount.current}/${lobbyPlayerCount.max})`
                    : 'Waiting for players to join...'}
                </em></p>
              </>
            ) : (
              <>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                  <label htmlFor="max-players" style={{ whiteSpace: 'nowrap' }}>Max players:</label>
                  <select
                    id="max-players"
                    value={maxPlayers}
                    onChange={e => setMaxPlayers(Number(e.target.value))}
                  >
                    {[2, 3, 4, 5, 6].map(n => (
                      <option key={n} value={n}>{n}</option>
                    ))}
                  </select>
                </div>
                <button onClick={() => createRoom(maxPlayers)}>Create Room</button>
              </>
            )}
          </div>
        </div>

        {/* Join with Code */}
        <div className="window" style={{ width: '100%' }}>
          <div className="title-bar">
            <div className="title-bar-text">Join with Code</div>
          </div>
          <div className="window-body">
            <p style={{ marginBottom: 8 }}>Enter a friend's room code.</p>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <input
                type="text"
                className="textbox"
                maxLength={4}
                value={codeInput}
                onChange={e => setCodeInput(e.target.value.toUpperCase())}
                placeholder="XXXX"
                style={{ width: 80 }}
              />
              <button onClick={handleJoin}>Join</button>
            </div>
            {lobbyError && <p className="error-text">{lobbyError}</p>}
          </div>
        </div>

      </div>

      <div className="status-bar" style={{ width: 340 }}>
        <p className="status-bar-field">Tank Trouble v1.0</p>
        <p className="status-bar-field">2–6 Players</p>
      </div>
    </div>
  );
}

