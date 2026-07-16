import { useState, useCallback } from 'react';
import InviteModal from './InviteModal';

const genCode = () => Math.random().toString(36).substring(2, 9).toUpperCase();

function Lobby({ username, onJoinRoom, onDirectJoin, onLogout }) {
  const [joinRoom, setJoinRoom] = useState('');
  const [createCode, setCreateCode] = useState(genCode);
  const [inviteOpen, setInviteOpen] = useState(true);

  const handleJoin = (e) => {
    e.preventDefault();
    if (joinRoom.trim()) onJoinRoom(joinRoom.trim());
  };

  const handleCreate = (e) => {
    e.preventDefault();
    if (createCode.trim()) onJoinRoom(createCode.trim());
  };

  const refreshCode = useCallback(() => setCreateCode(genCode()), []);

  return (
    <div style={{
      display: 'flex', height: '100vh', alignItems: 'center', justifyContent: 'center',
      background: 'linear-gradient(180deg, #1a1a2e 0%, #16213e 100%)',
      fontFamily: "'Inter', sans-serif",
      padding: '1rem',
    }}>
      <style>{`
        .lobby-card {
          background: rgba(255,255,255,0.04);
          border: 1px solid rgba(255,255,255,0.08);
          border-radius: 24px;
          padding: 2.2rem 2.2rem 1.8rem;
          width: 440px; max-width: 95vw;
          box-shadow: 0 20px 60px rgba(0,0,0,0.4);
          text-align: center;
          animation: lobbyRise 0.4s cubic-bezier(0.16,1,0.3,1);
        }
        @keyframes lobbyRise {
          from { opacity: 0; transform: translateY(18px) scale(0.98); }
          to   { opacity: 1; transform: translateY(0) scale(1); }
        }
        .lobby-avatar {
          width: 60px; height: 60px; border-radius: 50%; margin: 0 auto 0.9rem;
          background: linear-gradient(135deg, #7c5cfc, #4f8cfc);
          display: flex; align-items: center; justify-content: center;
          font-size: 1.5rem; font-weight: 700; color: #fff;
          box-shadow: 0 8px 24px -6px rgba(124,92,252,0.55);
        }
        .lobby-card h2 {
          font-size: 1.25rem; font-weight: 700; color: #f5f3ff; margin: 0 0 4px;
          font-family: 'Space Grotesk', sans-serif;
        }
        .lobby-card > p { font-size: 0.85rem; color: #7d7ba3; margin: 0 0 1.6rem; }

        /* Section box */
        .lobby-section {
          background: rgba(255,255,255,0.03);
          border: 1px solid rgba(255,255,255,0.07);
          border-radius: 16px;
          padding: 1.1rem 1.1rem 1rem;
          text-align: left;
          margin-bottom: 0.9rem;
        }
        .lobby-section-title {
          font-size: 0.7rem; font-weight: 700; letter-spacing: 0.08em;
          color: #7d7ba3; margin: 0 0 0.75rem; text-transform: uppercase;
        }

        /* Create room code row */
        .lobby-code-row {
          display: flex; align-items: center; gap: 8px; margin-bottom: 0.7rem;
        }
        .lobby-code-input {
          flex: 1; padding: 0.65rem 0.9rem; border-radius: 10px;
          border: 1.5px solid rgba(124,92,252,0.3);
          background: rgba(124,92,252,0.08); color: #c4b5fd;
          font-size: 1rem; font-weight: 700; font-family: 'JetBrains Mono', monospace;
          letter-spacing: 0.12em; outline: none; text-transform: uppercase;
          transition: border-color 0.2s, box-shadow 0.2s;
        }
        .lobby-code-input:focus {
          border-color: #7c5cfc; box-shadow: 0 0 0 3px rgba(124,92,252,0.15);
        }
        .lobby-refresh-btn {
          width: 36px; height: 36px; border-radius: 10px; border: none; flex-shrink: 0;
          background: rgba(255,255,255,0.06); color: #888; font-size: 1rem;
          cursor: pointer; display: flex; align-items: center; justify-content: center;
          transition: background 0.2s, color 0.2s, transform 0.2s;
        }
        .lobby-refresh-btn:hover { background: rgba(255,255,255,0.12); color: #fff; transform: rotate(90deg); }
        .lobby-create-btn {
          width: 100%; padding: 0.7rem; border-radius: 10px; border: none;
          background: linear-gradient(135deg, #7c5cfc, #4f8cfc); color: #fff;
          font-size: 0.88rem; font-weight: 600; cursor: pointer;
          font-family: 'Inter', sans-serif;
          transition: filter 0.2s, transform 0.15s;
        }
        .lobby-create-btn:hover { filter: brightness(1.1); transform: translateY(-1px); }
        .lobby-code-hint {
          font-size: 0.72rem; color: #5f5d80; margin: 0 0 0.7rem;
        }

        /* Join row */
        .lobby-join-row { display: flex; gap: 8px; }
        .lobby-join-input {
          flex: 1; padding: 0.7rem 0.9rem; border-radius: 10px;
          border: 1.5px solid rgba(255,255,255,0.1);
          background: rgba(255,255,255,0.05); color: #f5f3ff;
          font-size: 0.9rem; font-family: 'Inter', sans-serif; outline: none;
          transition: border-color 0.2s, box-shadow 0.2s;
        }
        .lobby-join-input::placeholder { color: #5f5d80; }
        .lobby-join-input:focus {
          border-color: #7c5cfc; box-shadow: 0 0 0 3px rgba(124,92,252,0.15);
        }
        .lobby-join-btn {
          padding: 0.7rem 1.1rem; border-radius: 10px; border: none;
          background: rgba(124,92,252,0.2); border: 1px solid rgba(124,92,252,0.35);
          color: #c4b5fd; font-size: 0.88rem; font-weight: 600; cursor: pointer;
          font-family: 'Inter', sans-serif; white-space: nowrap;
          transition: background 0.2s, transform 0.15s;
        }
        .lobby-join-btn:hover { background: rgba(124,92,252,0.35); transform: translateY(-1px); }

        .lobby-divider {
          display: flex; align-items: center; gap: 10px;
          margin: 0.9rem 0; color: #5f5d80; font-size: 0.75rem;
        }
        .lobby-divider::before, .lobby-divider::after {
          content: ''; flex: 1; height: 1px; background: rgba(255,255,255,0.07);
        }

        .lobby-invite-btn {
          width: 100%; padding: 0.7rem; border-radius: 12px;
          border: 1.5px solid rgba(124,92,252,0.3);
          background: rgba(124,92,252,0.08); color: #c4b5fd;
          font-size: 0.88rem; font-weight: 600; cursor: pointer;
          font-family: 'Inter', sans-serif; margin-bottom: 0.6rem;
          transition: background 0.2s, border-color 0.2s;
        }
        .lobby-invite-btn:hover { background: rgba(124,92,252,0.2); border-color: rgba(124,92,252,0.5); }
        .lobby-logout-btn {
          width: 100%; padding: 0.6rem; border-radius: 12px;
          border: 1px solid rgba(239,68,68,0.25);
          background: rgba(239,68,68,0.07); color: #f87171;
          font-size: 0.83rem; font-weight: 500; cursor: pointer;
          font-family: 'Inter', sans-serif;
          transition: background 0.2s;
        }
        .lobby-logout-btn:hover { background: rgba(239,68,68,0.18); }
      `}</style>

      <div className="lobby-card">
        <div className="lobby-avatar">{username.charAt(0).toUpperCase()}</div>
        <h2>Hey, {username}!</h2>
        <p>You're not in any room yet. Create one or join an existing room.</p>

        {/* ── Create Room ── */}
        <div className="lobby-section">
          <p className="lobby-section-title">✨ Create a New Room</p>
          <p className="lobby-code-hint">Auto-generated code — edit it or refresh for a new one</p>
          <form onSubmit={handleCreate}>
            <div className="lobby-code-row">
              <input
                className="lobby-code-input"
                value={createCode}
                onChange={(e) => setCreateCode(e.target.value.toUpperCase().slice(0, 20))}
                maxLength={20}
                required
              />
              <button type="button" className="lobby-refresh-btn" title="Generate new code" onClick={refreshCode}>↻</button>
            </div>
            <button type="submit" className="lobby-create-btn">🚀 Create Room</button>
          </form>
        </div>

        <div className="lobby-divider">or join existing</div>

        {/* ── Join Room ── */}
        <div className="lobby-section">
          <p className="lobby-section-title">🔗 Join a Room</p>
          <form onSubmit={handleJoin}>
            <div className="lobby-join-row">
              <input
                className="lobby-join-input"
                placeholder="Enter room code..."
                value={joinRoom}
                onChange={(e) => setJoinRoom(e.target.value)}
                maxLength={50}
              />
              <button type="submit" className="lobby-join-btn">Join →</button>
            </div>
          </form>
        </div>

        <div className="lobby-divider">or</div>

        <button className="lobby-invite-btn" onClick={() => setInviteOpen(true)}>
          🔔 View Invitations
        </button>
        <button className="lobby-logout-btn" onClick={onLogout}>⏻ Sign Out</button>
      </div>

      {inviteOpen && (
        <InviteModal
          room=""
          username={username}
          onClose={() => setInviteOpen(false)}
          onAcceptInvite={(invRoom) => { setInviteOpen(false); onDirectJoin(invRoom); }}
          defaultTab="inbox"
          inboxOnly={true}
        />
      )}
    </div>
  );
}

export default Lobby;
