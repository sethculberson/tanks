import React, { useState } from 'react';

interface LobbyProps {
  onRandomMatch: () => void;
  onCreateRoom: () => void;
  onJoinRoom: (code: string) => void;
  error: string | null;
  waiting: boolean;
  roomCode: string | null;
}

export default function Lobby({ onRandomMatch, onCreateRoom, onJoinRoom, error, waiting, roomCode }: LobbyProps) {
  const [codeInput, setCodeInput] = useState('');

  const labelStyle: React.CSSProperties = {
    fontFamily: "'Times New Roman', Times, serif",
    fontSize: 14,
    color: '#5a3e28',
    marginBottom: 4,
    display: 'block',
  };

  const sectionStyle: React.CSSProperties = {
    background: '#e8d9c4',
    border: '2px inset #a08060',
    padding: '16px 20px',
    width: 320,
    display: 'flex',
    flexDirection: 'column',
    gap: 8,
  };

  const btnStyle: React.CSSProperties = {
    padding: '7px 18px',
    fontFamily: "'Times New Roman', Times, serif",
    fontSize: 15,
    background: '#d4c4a8',
    color: '#2c1a0e',
    border: '3px outset #a08060',
    cursor: 'pointer',
    alignSelf: 'flex-start',
  };

  const inputStyle: React.CSSProperties = {
    fontFamily: "'Times New Roman', Times, serif",
    fontSize: 18,
    letterSpacing: 4,
    textTransform: 'uppercase',
    width: 100,
    padding: '4px 8px',
    border: '2px inset #a08060',
    background: '#f5eddf',
    color: '#2c1a0e',
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 0 }}>
      <h1 style={{
        fontFamily: "'Times New Roman', Times, serif",
        fontSize: 32,
        fontWeight: 'bold',
        color: '#2c1a0e',
        letterSpacing: 2,
        borderBottom: '2px solid #5a3e28',
        paddingBottom: 6,
        marginBottom: 20,
      }}>
        TANK TROUBLE
      </h1>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 12, width: 320 }}>

        {/* Random Match */}
        <div style={sectionStyle}>
          <strong style={{ fontFamily: "'Times New Roman', Times, serif", fontSize: 16 }}>Random Match</strong>
          <span style={{ ...labelStyle, marginBottom: 0 }}>Get paired with a random opponent.</span>
          {waiting && !roomCode ? (
            <em style={labelStyle}>Searching for opponent...</em>
          ) : (
            <button style={btnStyle} onClick={onRandomMatch}>Find Match</button>
          )}
        </div>

        {/* Create Room */}
        <div style={sectionStyle}>
          <strong style={{ fontFamily: "'Times New Roman', Times, serif", fontSize: 16 }}>Create Private Room</strong>
          <span style={labelStyle}>Share the code with a friend.</span>
          {roomCode ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              <span style={labelStyle}>Your room code:</span>
              <span style={{
                fontFamily: "'Times New Roman', Times, serif",
                fontSize: 28,
                letterSpacing: 8,
                fontWeight: 'bold',
                color: '#3b1f0a',
              }}>{roomCode}</span>
              <em style={labelStyle}>Waiting for opponent to join...</em>
            </div>
          ) : (
            <button style={btnStyle} onClick={onCreateRoom}>Create Room</button>
          )}
        </div>

        {/* Join with Code */}
        <div style={sectionStyle}>
          <strong style={{ fontFamily: "'Times New Roman', Times, serif", fontSize: 16 }}>Join with Code</strong>
          <span style={labelStyle}>Enter a friend's room code.</span>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <input
              style={inputStyle}
              maxLength={4}
              value={codeInput}
              onChange={e => setCodeInput(e.target.value.toUpperCase())}
              placeholder="XXXX"
            />
            <button style={btnStyle} onClick={() => onJoinRoom(codeInput)}>Join</button>
          </div>
          {error && <span style={{ ...labelStyle, color: '#8b0000' }}>{error}</span>}
        </div>

      </div>
    </div>
  );
}
