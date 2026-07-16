import { useState, useEffect, useRef } from 'react';

const SOCKET_URL = process.env.REACT_APP_SERVER_URL || 'http://localhost:5000';

function InviteModal({ room, username, onClose, onAcceptInvite, defaultTab = 'invite', inboxOnly = false }) {
  const [tab, setTab] = useState(defaultTab); // 'invite' | 'inbox'

  // ── Invite tab state ──────────────────────────────────────────────────────
  const [query, setQuery] = useState('');
  const [users, setUsers] = useState([]);
  const [sent, setSent] = useState({});
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [usersError, setUsersError] = useState('');

  // ── Inbox tab state ───────────────────────────────────────────────────────
  const [invites, setInvites] = useState([]);
  const [loadingInvites, setLoadingInvites] = useState(false);
  const [responding, setResponding] = useState({}); // { id: 'accepting' | 'rejecting' }

  const overlayRef = useRef(null);
  const inputRef = useRef(null);

  // ── Fetch all users (invite tab) ──────────────────────────────────────────
  useEffect(() => {
    if (tab !== 'invite') return;
    let cancelled = false;
    const run = async () => {
      setLoadingUsers(true);
      setUsersError('');
      try {
        const res = await fetch(`${SOCKET_URL}/api/users?q=${encodeURIComponent(query)}`);
        if (!res.ok) throw new Error();
        const data = await res.json();
        if (!cancelled)
          setUsers(Array.isArray(data) ? data.filter(u => u.username !== username) : []);
      } catch {
        if (!cancelled) { setUsers([]); setUsersError('Failed to load users'); }
      } finally {
        if (!cancelled) setLoadingUsers(false);
      }
    };
    const t = setTimeout(run, query ? 300 : 0);
    return () => { cancelled = true; clearTimeout(t); };
  }, [query, username, tab]);

  // ── Fetch pending invites (inbox tab) ─────────────────────────────────────
  const fetchInvites = async () => {
    setLoadingInvites(true);
    try {
      const res = await fetch(`${SOCKET_URL}/api/invites/${username}`);
      const data = await res.json();
      setInvites(Array.isArray(data) ? data : []);
    } catch { setInvites([]); }
    finally { setLoadingInvites(false); }
  };

  useEffect(() => {
    fetchInvites();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [username]);

  // focus search input when invite tab is active
  useEffect(() => {
    if (tab === 'invite') inputRef.current?.focus();
  }, [tab]);

  // close on overlay click / Escape
  const handleOverlay = (e) => { if (e.target === overlayRef.current) onClose(); };
  useEffect(() => {
    const h = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [onClose]);

  // ── Send invite ───────────────────────────────────────────────────────────
  const handleInvite = async (toUsername) => {
    setSent(s => ({ ...s, [toUsername]: 'sending' }));
    try {
      const res = await fetch(`${SOCKET_URL}/api/invites`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fromUsername: username, toUsername, room }),
      });
      setSent(s => ({ ...s, [toUsername]: res.ok ? 'sent' : 'error' }));
    } catch {
      setSent(s => ({ ...s, [toUsername]: 'error' }));
    }
  };

  // ── Respond to invite ─────────────────────────────────────────────────────
  const handleRespond = async (inv, status) => {
    setResponding(r => ({ ...r, [inv.id]: status === 'accepted' ? 'accepting' : 'rejecting' }));
    try {
      const res = await fetch(`${SOCKET_URL}/api/invites/respond`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: inv.id, status }),
      });
      if (!res.ok) throw new Error('Failed to respond to invite');
      setInvites(prev => prev.filter(i => i.id !== inv.id));
      if (status === 'accepted') {
        onAcceptInvite(inv.room);
        onClose();
      }
    } catch {
      setResponding(r => ({ ...r, [inv.id]: null }));
    }
  };

  const pendingCount = invites.length;

  return (
    <>
      <style>{`
        .invite-overlay {
          position: fixed; inset: 0; z-index: 3000;
          background: rgba(0,0,0,0.6);
          display: flex; align-items: center; justify-content: center;
          animation: invFadeIn 0.18s ease;
        }
        @keyframes invFadeIn { from{opacity:0} to{opacity:1} }

        .invite-modal {
          background: linear-gradient(180deg, #1e2040 0%, #161830 100%);
          border: 1px solid rgba(124,92,252,0.25);
          border-radius: 20px; width: 440px; max-width: 95vw;
          max-height: 82vh; display: flex; flex-direction: column;
          box-shadow: 0 24px 64px rgba(0,0,0,0.6), 0 0 0 1px rgba(255,255,255,0.03) inset;
          animation: invSlideUp 0.22s cubic-bezier(0.16,1,0.3,1);
          overflow: hidden;
        }
        @keyframes invSlideUp {
          from{opacity:0;transform:translateY(20px) scale(0.97)}
          to{opacity:1;transform:translateY(0) scale(1)}
        }

        /* Header */
        .invite-header {
          display: flex; align-items: center; justify-content: space-between;
          padding: 1.1rem 1.4rem 0.9rem;
          border-bottom: 1px solid rgba(255,255,255,0.07);
          flex-shrink: 0;
        }
        .invite-header-left { display: flex; align-items: center; gap: 10px; }
        .invite-header-icon {
          width: 38px; height: 38px; border-radius: 12px;
          background: linear-gradient(135deg, #7c5cfc, #4f8cfc);
          display: flex; align-items: center; justify-content: center;
          font-size: 18px; flex-shrink: 0;
        }
        .invite-header-text h4 { font-size: 0.95rem; font-weight: 700; color: #f5f3ff; margin: 0; }
        .invite-header-text p  { font-size: 0.75rem; color: #7d7ba3; margin: 2px 0 0; }
        .invite-close-btn {
          background: rgba(255,255,255,0.06); border: 1px solid rgba(255,255,255,0.1);
          border-radius: 8px; color: #888; font-size: 1rem; width: 30px; height: 30px;
          display: flex; align-items: center; justify-content: center;
          cursor: pointer; transition: background 0.2s, color 0.2s; flex-shrink: 0;
        }
        .invite-close-btn:hover { background: rgba(255,255,255,0.12); color: #fff; }

        /* Tabs */
        .invite-tabs {
          display: flex; gap: 4px; padding: 0.7rem 1.4rem 0;
          border-bottom: 1px solid rgba(255,255,255,0.07);
          flex-shrink: 0;
        }
        .invite-tab {
          display: flex; align-items: center; gap: 6px;
          padding: 0.5rem 1rem; border: none; background: none;
          color: #7d7ba3; font-size: 0.85rem; font-weight: 600;
          cursor: pointer; border-bottom: 2px solid transparent;
          margin-bottom: -1px; transition: color 0.2s, border-color 0.2s;
          font-family: 'Inter', sans-serif;
        }
        .invite-tab.active { color: #c4b5fd; border-bottom-color: #7c5cfc; }
        .invite-tab:hover:not(.active) { color: #e2e8f0; }
        .invite-tab-badge {
          background: #7c5cfc; color: #fff;
          font-size: 0.65rem; font-weight: 700;
          padding: 1px 6px; border-radius: 20px; line-height: 1.4;
        }

        /* Search */
        .invite-search-wrap {
          padding: 0.8rem 1.4rem 0.6rem;
          border-bottom: 1px solid rgba(255,255,255,0.06);
          flex-shrink: 0;
        }
        .invite-search-inner {
          display: flex; align-items: center; gap: 8px;
          background: rgba(255,255,255,0.06); border: 1.5px solid rgba(124,92,252,0.2);
          border-radius: 12px; padding: 0 12px;
          transition: border-color 0.2s, box-shadow 0.2s;
        }
        .invite-search-inner:focus-within {
          border-color: #7c5cfc; box-shadow: 0 0 0 3px rgba(124,92,252,0.15);
        }
        .invite-search-icon { font-size: 14px; opacity: 0.5; flex-shrink: 0; }
        .invite-search-input {
          flex: 1; background: none; border: none; outline: none;
          color: #f5f3ff; font-size: 0.88rem; padding: 10px 0;
          font-family: 'Inter', sans-serif;
        }
        .invite-search-input::placeholder { color: #5f5d80; }
        .invite-search-clear {
          background: none; border: none; color: #5f5d80;
          cursor: pointer; font-size: 12px; padding: 0 2px;
        }

        /* Scrollable body */
        .invite-body {
          flex: 1; overflow-y: auto; padding: 0.5rem 0.8rem 0.8rem;
        }
        .invite-body::-webkit-scrollbar { width: 4px; }
        .invite-body::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.1); border-radius: 4px; }

        .invite-empty  { text-align: center; color: #5f5d80; font-size: 0.85rem; padding: 2rem 0; }
        .invite-loading{ text-align: center; color: #7d7ba3; font-size: 0.82rem; padding: 1.5rem 0; }

        /* User row */
        .invite-user-item {
          display: flex; align-items: center; gap: 10px;
          padding: 0.55rem 0.6rem; border-radius: 12px; transition: background 0.15s;
        }
        .invite-user-item:hover { background: rgba(255,255,255,0.05); }
        .invite-user-avatar {
          width: 38px; height: 38px; border-radius: 50%; flex-shrink: 0;
          background: linear-gradient(135deg, #667eea, #764ba2);
          display: flex; align-items: center; justify-content: center;
          font-size: 0.9rem; font-weight: 700; color: #fff;
        }
        .invite-user-info { flex: 1; min-width: 0; }
        .invite-user-name {
          font-size: 0.88rem; font-weight: 600; color: #e2e8f0;
          white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
        }
        .invite-user-email {
          font-size: 0.75rem; color: #7d7ba3; margin-top: 1px;
          white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
        }
        .invite-send-btn {
          padding: 0.38rem 0.9rem; border-radius: 8px; font-size: 0.78rem;
          font-weight: 600; cursor: pointer; flex-shrink: 0;
          border: 1px solid; transition: background 0.2s, transform 0.15s;
          font-family: 'Inter', sans-serif;
        }
        .invite-send-btn.idle  { background: rgba(124,92,252,0.18); border-color: rgba(124,92,252,0.4); color: #c4b5fd; }
        .invite-send-btn.idle:hover { background: rgba(124,92,252,0.35); transform: translateY(-1px); }
        .invite-send-btn.sending { background: rgba(255,255,255,0.06); border-color: rgba(255,255,255,0.1); color: #888; cursor: not-allowed; }
        .invite-send-btn.sent  { background: rgba(74,222,128,0.12); border-color: rgba(74,222,128,0.3); color: #4ade80; cursor: default; }
        .invite-send-btn.error { background: rgba(239,68,68,0.12); border-color: rgba(239,68,68,0.3); color: #f87171; }

        /* Inbox invite card */
        .inbox-card {
          display: flex; align-items: center; gap: 12px;
          padding: 0.75rem 0.8rem; border-radius: 14px; margin-bottom: 6px;
          background: rgba(124,92,252,0.08); border: 1px solid rgba(124,92,252,0.18);
          transition: background 0.15s;
        }
        .inbox-card:hover { background: rgba(124,92,252,0.13); }
        .inbox-avatar {
          width: 42px; height: 42px; border-radius: 50%; flex-shrink: 0;
          background: linear-gradient(135deg, #7c5cfc, #4f8cfc);
          display: flex; align-items: center; justify-content: center;
          font-size: 1rem; font-weight: 700; color: #fff;
        }
        .inbox-info { flex: 1; min-width: 0; }
        .inbox-from {
          font-size: 0.88rem; font-weight: 600; color: #e2e8f0;
          white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
        }
        .inbox-room {
          font-size: 0.78rem; color: #a78bfa; margin-top: 2px;
          white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
        }
        .inbox-time {
          font-size: 0.7rem; color: #5f5d80; margin-top: 2px;
        }
        .inbox-actions { display: flex; gap: 6px; flex-shrink: 0; }
        .inbox-accept-btn {
          padding: 0.35rem 0.8rem; border-radius: 8px; font-size: 0.78rem;
          font-weight: 600; cursor: pointer; border: 1px solid;
          font-family: 'Inter', sans-serif; transition: background 0.2s, transform 0.15s;
          background: rgba(74,222,128,0.15); border-color: rgba(74,222,128,0.4); color: #4ade80;
        }
        .inbox-accept-btn:hover:not(:disabled) { background: rgba(74,222,128,0.3); transform: translateY(-1px); }
        .inbox-accept-btn:disabled { opacity: 0.5; cursor: not-allowed; transform: none; }
        .inbox-reject-btn {
          padding: 0.35rem 0.8rem; border-radius: 8px; font-size: 0.78rem;
          font-weight: 600; cursor: pointer; border: 1px solid;
          font-family: 'Inter', sans-serif; transition: background 0.2s, transform 0.15s;
          background: rgba(239,68,68,0.12); border-color: rgba(239,68,68,0.35); color: #f87171;
        }
        .inbox-reject-btn:hover:not(:disabled) { background: rgba(239,68,68,0.28); transform: translateY(-1px); }
        .inbox-reject-btn:disabled { opacity: 0.5; cursor: not-allowed; transform: none; }
      `}</style>

      <div className="invite-overlay" ref={overlayRef} onClick={handleOverlay}>
        <div className="invite-modal">

          {/* ── Header ── */}
          <div className="invite-header">
            <div className="invite-header-left">
              <div className="invite-header-icon">👥</div>
              <div className="invite-header-text">
                <h4>{tab === 'invite' ? (room ? `Invite to #${room}` : 'Invite Users') : 'My Invitations'}</h4>
                <p>{tab === 'invite' ? 'Search and invite users to this room' : 'Pending room invitations for you'}</p>
              </div>
            </div>
            <button className="invite-close-btn" onClick={onClose}>✕</button>
          </div>

          {/* ── Tabs ── */}
          {!inboxOnly && (
            <div className="invite-tabs">
              <button
                className={`invite-tab ${tab === 'invite' ? 'active' : ''}`}
                onClick={() => setTab('invite')}
              >📨 Invite</button>
              <button
                className={`invite-tab ${tab === 'inbox' ? 'active' : ''}`}
                onClick={() => setTab('inbox')}
              >
                🔔 Invitations
                {pendingCount > 0 && <span className="invite-tab-badge">{pendingCount}</span>}
              </button>
            </div>
          )}

          {/* ── Invite Tab ── */}
          {tab === 'invite' && (
            <>
              <div className="invite-search-wrap">
                <div className="invite-search-inner">
                  <span className="invite-search-icon">🔍</span>
                  <input
                    ref={inputRef}
                    className="invite-search-input"
                    placeholder="Search by username or email..."
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                  />
                  {query && (
                    <button className="invite-search-clear" onClick={() => setQuery('')}>✕</button>
                  )}
                </div>
              </div>
              <div className="invite-body">
                {loadingUsers && <p className="invite-loading">Loading users…</p>}
                {!loadingUsers && usersError && <p className="invite-empty" style={{ color: '#f87171' }}>{usersError}</p>}
                {!loadingUsers && !usersError && users.length === 0 && (
                  <p className="invite-empty">
                    {query ? `No users found for "${query}"` : 'No registered users yet'}
                  </p>
                )}
                {!loadingUsers && users.map((u) => {
                  const state = sent[u.username] || 'idle';
                  return (
                    <div className="invite-user-item" key={u.username}>
                      <div className="invite-user-avatar">{u.username.charAt(0).toUpperCase()}</div>
                      <div className="invite-user-info">
                        <div className="invite-user-name">{u.username}</div>
                        <div className="invite-user-email">{u.email}</div>
                      </div>
                      <button
                        className={`invite-send-btn ${state}`}
                        disabled={state === 'sending' || state === 'sent'}
                        onClick={() => (state === 'idle' || state === 'error') && handleInvite(u.username)}
                      >
                        {state === 'idle'    && 'Invite'}
                        {state === 'sending' && '…'}
                        {state === 'sent'    && '✓ Sent'}
                        {state === 'error'   && 'Retry'}
                      </button>
                    </div>
                  );
                })}
              </div>
            </>
          )}

          {/* ── Inbox Tab ── */}
          {tab === 'inbox' && (
            <div className="invite-body">
              {loadingInvites && <p className="invite-loading">Loading invitations…</p>}
              {!loadingInvites && invites.length === 0 && (
                <p className="invite-empty">No pending invitations</p>
              )}
              {!loadingInvites && invites.map((inv) => {
                const busy = responding[inv.id];
                return (
                  <div className="inbox-card" key={inv.id}>
                    <div className="inbox-avatar">{inv.from_username.charAt(0).toUpperCase()}</div>
                    <div className="inbox-info">
                      <div className="inbox-from">{inv.from_username}</div>
                      <div className="inbox-room">#{inv.room}</div>
                      <div className="inbox-time">
                        {new Date(inv.created_at).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })}
                      </div>
                    </div>
                    <div className="inbox-actions">
                      <button
                        className="inbox-accept-btn"
                        disabled={!!busy}
                        onClick={() => handleRespond(inv, 'accepted')}
                      >{busy === 'accepting' ? '…' : 'Accept'}</button>
                      <button
                        className="inbox-reject-btn"
                        disabled={!!busy}
                        onClick={() => handleRespond(inv, 'declined')}
                      >{busy === 'rejecting' ? '…' : 'Reject'}</button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

        </div>
      </div>
    </>
  );
}

export default InviteModal;
