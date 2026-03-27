import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSocket } from './SocketContext';

export default function LobbyPage() {
  const navigate = useNavigate();
  const {
    lobbyError, lobbyWaiting, roomCode,
    createRoom, joinRoom, randomMatch,
    onMatchedRef,
  } = useSocket();

  const [codeInput, setCodeInput] = useState('');

  // Navigate to game when matched
  useEffect(() => {
    onMatchedRef.current = (code) => {
      navigate(`/game/${code}`);
    };
    return () => { onMatchedRef.current = null; };
  }, [navigate, onMatchedRef]);

  const handleJoin = () => {
    joinRoom(codeInput);
  };

  return (
    <div className="page-center">
      <h1 className="game-title">TANK TROUBLE</h1>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 10, width: 340 }}>

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
                <p><em>Waiting for opponent to join...</em></p>
              </>
            ) : (
              <button onClick={createRoom}>Create Room</button>
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
        <p className="status-bar-field">2 Players</p>
      </div>
    </div>
  );
}
