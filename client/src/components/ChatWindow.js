import { useEffect, useRef, useState } from 'react';

const SOCKET_URL = process.env.REACT_APP_SERVER_URL || 'http://localhost:5000';
const REACTION_EMOJIS = ['👍', '❤️', '😂', '😮', '😢', '🔥'];

const GlobalStyles = () => (
  <style>{`
    @import url('https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@500;600;700&family=Inter:wght@400;500;600&family=JetBrains+Mono:wght@500;600&display=swap');

    .chat-window {
      display: flex; flex-direction: column; gap: 0.9rem;
      height: 100%; padding: 24px 20px; overflow-y: auto;
      background:
        radial-gradient(circle at 10% 0%, rgba(124,92,252,0.12), transparent 40%),
        radial-gradient(circle at 90% 100%, rgba(45,212,191,0.10), transparent 40%),
        #0a0b1e;
      font-family: 'Inter', sans-serif; scroll-behavior: smooth;
    }
    .chat-window::-webkit-scrollbar { width: 8px; }
    .chat-window::-webkit-scrollbar-track { background: transparent; }
    .chat-window::-webkit-scrollbar-thumb { background: rgba(124,92,252,0.3); border-radius: 8px; }
    .chat-window::-webkit-scrollbar-thumb:hover { background: rgba(124,92,252,0.5); }

    .notification {
      align-self: center; display: inline-flex; align-items: center; gap: 6px;
      margin: 6px auto; padding: 6px 16px; border-radius: 999px;
      background: rgba(124,92,252,0.1); border: 1px solid rgba(124,92,252,0.22);
      color: #b6b4de; font-size: 12.5px; font-weight: 500; letter-spacing: 0.01em;
      animation: fadeInUp 0.35s ease both;
    }

    .message-row {
      display: flex; align-items: flex-end; gap: 10px;
      max-width: 78%; animation: fadeInUp 0.35s ease both;
      position: relative;
    }
    .message-row.own { align-self: flex-end; flex-direction: row-reverse; }

    @keyframes fadeInUp {
      from { opacity: 0; transform: translateY(10px); }
      to   { opacity: 1; transform: translateY(0); }
    }

    .msg-avatar {
      flex-shrink: 0; width: 32px; height: 32px; border-radius: 10px;
      display: flex; align-items: center; justify-content: center;
      font-family: 'Space Grotesk', sans-serif; font-weight: 700; font-size: 13px;
      color: #fff; background: linear-gradient(135deg, #7c5cfc, #4f8cfc);
      box-shadow: 0 4px 12px -4px rgba(124,92,252,0.55);
    }

    .message {
      position: relative; display: flex; flex-direction: column;
      padding: 9px 14px 8px; border-radius: 16px;
      background: rgba(255,255,255,0.05); border: 1px solid rgba(124,92,252,0.16);
      backdrop-filter: blur(6px); max-width: 100%;
    }
    .message-row:not(.own) .message { border-bottom-left-radius: 4px; }
    .message-row.own .message {
      background: linear-gradient(135deg, rgba(124,92,252,0.9), rgba(79,140,252,0.9));
      border: 1px solid rgba(124,92,252,0.5); border-bottom-right-radius: 4px;
      box-shadow: 0 8px 20px -8px rgba(124,92,252,0.5);
    }
    .message.deleted-msg { opacity: 0.45; font-style: italic; }

    .msg-user {
      font-family: 'Space Grotesk', sans-serif; font-size: 12px;
      font-weight: 600; color: #9d8dfc; margin-bottom: 3px;
    }
    .message p { margin: 0; font-size: 14.5px; line-height: 1.45; color: #f5f3ff; word-break: break-word; white-space: pre-wrap; }
    .message-row.own .message p { color: #fff; }

    .msg-footer { display: flex; align-items: center; justify-content: flex-end; gap: 6px; margin-top: 3px; }
    .msg-time {
      font-family: 'JetBrains Mono', monospace; font-size: 10px;
      color: rgba(255,255,255,0.45); letter-spacing: 0.02em;
    }
    .message-row.own .msg-time { color: rgba(255,255,255,0.7); }

    /* Seen eye button */
    .msg-seen-btn {
      background: none; border: none; cursor: pointer; padding: 0;
      font-size: 11px; color: rgba(255,255,255,0.5); line-height: 1;
      transition: color 0.2s;
    }
    .msg-seen-btn:hover { color: #a78bfa; }

    /* Action buttons — flex sibling of .message, shown on row hover */
    .msg-actions {
      display: none; align-items: center; gap: 4px;
      align-self: center; flex-shrink: 0;
    }
    .msg-actions-own { flex-direction: row-reverse; }
    .message-row:hover .msg-actions { display: flex; }
    .msg-action-btn {
      background: rgba(20,20,40,0.92); border: 1px solid rgba(255,255,255,0.1);
      border-radius: 8px; padding: 3px 8px; font-size: 12px; cursor: pointer;
      color: #ccc; transition: background 0.2s, color 0.2s;
    }
    .msg-action-btn:hover { background: rgba(239,68,68,0.25); color: #f87171; }

    /* Seen popup */
    .seen-popup-overlay {
      position: fixed; inset: 0; background: rgba(0,0,0,0.55);
      display: flex; align-items: center; justify-content: center; z-index: 1000;
    }
    .seen-popup {
      background: #1a1a2e; border: 1px solid rgba(255,255,255,0.1);
      border-radius: 16px; padding: 1.4rem; width: 320px;
      box-shadow: 0 20px 60px rgba(0,0,0,0.5);
    }
    .seen-popup-header {
      display: flex; align-items: center; justify-content: space-between;
      margin-bottom: 1rem; font-size: 0.9rem; font-weight: 700; color: #fff;
    }
    .seen-popup-close {
      background: none; border: none; color: #888; font-size: 1rem;
      cursor: pointer; padding: 2px 6px; border-radius: 6px;
    }
    .seen-popup-close:hover { background: rgba(255,255,255,0.08); color: #fff; }
    .seen-section-label {
      font-size: 0.7rem; font-weight: 700; color: #888; letter-spacing: 1px;
      margin: 0.6rem 0 0.4rem;
    }
    .seen-user-row {
      display: flex; align-items: center; gap: 8px;
      padding: 0.35rem 0; font-size: 0.85rem; color: #e2e8f0;
    }
    .seen-avatar {
      width: 26px; height: 26px; border-radius: 8px;
      background: linear-gradient(135deg, #7c5cfc, #4f8cfc);
      display: flex; align-items: center; justify-content: center;
      font-size: 11px; font-weight: 700; color: #fff; flex-shrink: 0;
    }

    /* Typing indicator */
    .typing-indicator {
      align-self: flex-start; display: flex; align-items: center; gap: 8px;
      padding: 8px 14px; border-radius: 16px; border-bottom-left-radius: 4px;
      background: rgba(255,255,255,0.05); border: 1px solid rgba(124,92,252,0.16);
      margin-bottom: 4px; animation: fadeInUp 0.3s ease both;
    }
    .typing-dots { display: flex; gap: 4px; }
    .typing-dots span {
      width: 6px; height: 6px; border-radius: 50%; background: #9d8dfc;
      animation: bounce 1.2s infinite;
    }
    .typing-dots span:nth-child(2) { animation-delay: 0.2s; }
    .typing-dots span:nth-child(3) { animation-delay: 0.4s; }
    @keyframes bounce {
      0%, 60%, 100% { transform: translateY(0); }
      30% { transform: translateY(-6px); }
    }
    .typing-text { font-size: 12px; color: #9d8dfc; font-style: italic; }

    /* Message search bar */
    .msg-search-bar {
      display: flex; align-items: center; gap: 8px;
      padding: 8px 16px; background: rgba(124,92,252,0.08);
      border-bottom: 1px solid rgba(124,92,252,0.15);
    }
    .msg-search-bar input {
      flex: 1; background: rgba(255,255,255,0.07); border: 1px solid rgba(255,255,255,0.1);
      border-radius: 8px; padding: 6px 12px; color: #fff; font-size: 0.88rem; outline: none;
    }
    .msg-search-bar input:focus { border-color: #7c5cfc; }
    .msg-search-close {
      background: none; border: none; color: #888; cursor: pointer; font-size: 1rem;
      padding: 2px 6px; border-radius: 6px;
    }
    .msg-search-close:hover { color: #fff; }
    .msg-search-nav {
      background: rgba(255,255,255,0.07); border: 1px solid rgba(255,255,255,0.12);
      border-radius: 6px; color: #ccc; cursor: pointer; font-size: 13px;
      padding: 2px 8px; transition: background 0.2s;
    }
    .msg-search-nav:hover { background: rgba(124,92,252,0.3); color: #fff; }
    .msg-search-nav:disabled { opacity: 0.3; cursor: default; }
    .msg-search-count { font-size: 0.78rem; color: #888; white-space: nowrap; }
    .message.search-highlight { outline: 2px solid #7c5cfc; outline-offset: 2px; }

    @media (max-width: 480px) {
      .chat-window { padding: 16px 12px; }
      .message-row { max-width: 88%; }
    }
  `}</style>
);

function SeenPopup({ message, onlineUsers, username, onClose }) {
  const [seenData, setSeenData] = useState([]);

  useEffect(() => {
    if (!message?.id) return;
    fetch(`${SOCKET_URL}/api/seen/${message.id}`)
      .then((r) => r.json())
      .then(setSeenData);
  }, [message]);

  if (!message) return null;

  const seenUsernames = seenData.map((s) => s.username);
  const roomMembers = onlineUsers.filter((u) => u.username !== username);
  const notSeen = roomMembers.filter((u) => !seenUsernames.includes(u.username));
  const seen = roomMembers.filter((u) => seenUsernames.includes(u.username));

  return (
    <div className="seen-popup-overlay" onClick={onClose}>
      <div className="seen-popup" onClick={(e) => e.stopPropagation()}>
        <div className="seen-popup-header">
          <span>👁 Message Info</span>
          <button className="seen-popup-close" onClick={onClose}>✕</button>
        </div>
        <p className="seen-section-label">SEEN BY — {seen.length}</p>
        {seen.length === 0 && <p style={{ fontSize: '0.8rem', color: '#555' }}>No one yet</p>}
        {seen.map((u) => (
          <div key={u.username} className="seen-user-row">
            <div className="seen-avatar">{u.username.charAt(0).toUpperCase()}</div>
            <span>{u.username}</span>
            <span style={{ marginLeft: 'auto', fontSize: '0.72rem', color: '#555' }}>
              {seenData.find((s) => s.username === u.username)?.seen_at
                ? new Date(seenData.find((s) => s.username === u.username).seen_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                : ''}
            </span>
          </div>
        ))}
        <p className="seen-section-label" style={{ marginTop: '0.8rem' }}>DELIVERED (NOT SEEN) — {notSeen.length}</p>
        {notSeen.length === 0 && <p style={{ fontSize: '0.8rem', color: '#555' }}>Everyone has seen it</p>}
        {notSeen.map((u) => (
          <div key={u.username} className="seen-user-row">
            <div className="seen-avatar" style={{ opacity: 0.5 }}>{u.username.charAt(0).toUpperCase()}</div>
            <span style={{ color: '#888' }}>{u.username}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function ChatWindow({ messages, username, isAdmin, onDeleteMessage, onlineUsers, room, searchOpen, onCloseSearch }) {
  const bottomRef = useRef(null);
  const [seenMsg, setSeenMsg] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [searchIdx, setSearchIdx] = useState(0);
  const msgRefs = useRef({});

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Message search
  useEffect(() => {
    if (!searchQuery.trim()) { setSearchResults([]); return; }
    const lower = searchQuery.toLowerCase();
    const results = messages
      .map((m, i) => ({ i, m }))
      .filter(({ m }) => m.type !== 'notification' && !m.deleted && m.message?.toLowerCase().includes(lower));
    setSearchResults(results.map(({ i }) => i));
    setSearchIdx(0);
  }, [searchQuery, messages]);

  useEffect(() => {
    if (searchResults.length === 0) return;
    const idx = searchResults[searchIdx];
    const key = messages[idx]?.id || idx;
    msgRefs.current[key]?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }, [searchIdx, searchResults, messages]);

  const getInitial = (name) => name.charAt(0).toUpperCase();

  const step = (dir) => {
    if (searchResults.length === 0) return;
    setSearchIdx((prev) => (prev + dir + searchResults.length) % searchResults.length);
  };

  const isGroupedWithPrev = (msg, i) => {
    const prev = messages[i - 1];
    if (!prev || prev.type === 'notification' || msg.type === 'notification') return false;
    return prev.username === msg.username;
  };

  return (
    <>
      {searchOpen && (
        <div className="msg-search-bar">
          <input
            autoFocus
            placeholder="Search messages..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') step(1);
              if (e.key === 'Escape') { onCloseSearch(); setSearchQuery(''); }
            }}
          />
          {searchResults.length > 0 && (
            <span className="msg-search-count">{searchIdx + 1}/{searchResults.length}</span>
          )}
          <button className="msg-search-nav" onClick={() => step(-1)} title="Previous">&#8593;</button>
          <button className="msg-search-nav" onClick={() => step(1)} title="Next">&#8595;</button>
          <button className="msg-search-close" onClick={() => { onCloseSearch(); setSearchQuery(''); }}>✕</button>
        </div>
      )}
      <div className="chat-window">
        <GlobalStyles />

        {messages.map((msg, i) => {
          const key = msg.id || i;
          const isSearchHit = searchResults[searchIdx] === i;

          return msg.type === 'notification' ? (
            <div key={i} className="notification"><span>{msg.text}</span></div>
          ) : (
            <div
              key={key}
              ref={(el) => { msgRefs.current[key] = el; }}
              className={`message-row ${msg.username === username ? 'own' : ''}`}
              style={isGroupedWithPrev(msg, i) ? { marginTop: '-0.6rem' } : undefined}
            >
              {msg.username !== username && (
                <div className="msg-avatar" style={isGroupedWithPrev(msg, i) ? { visibility: 'hidden' } : undefined}>
                  {getInitial(msg.username)}
                </div>
              )}
              <div className={`message ${msg.deleted ? 'deleted-msg' : ''} ${isSearchHit ? 'search-highlight' : ''}`}>
                {/* Reaction picker — inside message */}
                {msg.username !== username && !isGroupedWithPrev(msg, i) && (
                  <span className="msg-user">{msg.username}</span>
                )}
                <p>{msg.deleted ? '🗑 This message was deleted' : msg.message}</p>
                <div className="msg-footer">
                  <span className="msg-time">
                    {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                  {msg.username === username && msg.id && !msg.deleted && (
                    <button className="msg-seen-btn" title="Message info" onClick={() => setSeenMsg(msg)}>👁</button>
                  )}
                </div>
              </div>
              {!msg.deleted && (isAdmin || msg.username === username) && (
                <div className={`msg-actions ${msg.username === username ? 'msg-actions-own' : ''}`}>
                  <button className="msg-action-btn" onMouseDown={(e) => { e.stopPropagation(); onDeleteMessage(msg.id); }}>🗑</button>
                </div>
              )}
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>

      {seenMsg && (
        <SeenPopup
          message={seenMsg}
          onlineUsers={onlineUsers}
          username={username}
          onClose={() => setSeenMsg(null)}
        />
      )}
    </>
  );
}

export default ChatWindow;
