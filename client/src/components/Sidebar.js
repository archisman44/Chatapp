import { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';

const SOCKET_URL = process.env.REACT_APP_SERVER_URL || 'http://localhost:5000';

function Sidebar({ room, users, onLeave, username, myRooms, onSwitchRoom, onLeaveRoom, onLogout, onJoinRoom, joinRequests = [], onApprove, onReject, isAdmin, onMakeAdmin, onRemoveAdmin }) {
  const getInitial = (name) => name.charAt(0).toUpperCase();
  const [newRoom, setNewRoom] = useState('');
  const [search, setSearch] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [myRoomsFilter, setMyRoomsFilter] = useState('');
  const [infoRoom, setInfoRoom] = useState(null);
  const [ctxMenu, setCtxMenu] = useState(null);
  const [memberSearch, setMemberSearch] = useState('');
  const [memberSearchOpen, setMemberSearchOpen] = useState(false);
  const ctxRef = useRef(null);

  const handleSearch = (val) => {
    setSearch(val);
    if (val.trim().length === 0) { setSearchResults([]); return; }
    clearTimeout(window._roomSearchTimer);
    window._roomSearchTimer = setTimeout(() => {
      fetch(`${SOCKET_URL}/api/search/${val.trim()}`)
        .then(r => r.json()).then(setSearchResults);
    }, 300);
  };

  const joinRoom = (r) => {
    const target = r || newRoom.trim();
    if (target) { onJoinRoom(target); setNewRoom(''); setSearch(''); setSearchResults([]); }
  };

  const requestsForRoom = (r) => joinRequests.filter((req) => req.room === r);

  // Close context menu on outside click
  useEffect(() => {
    const handler = (e) => {
      if (ctxRef.current && !ctxRef.current.contains(e.target)) setCtxMenu(null);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const handleRightClick = (e, u) => {
    if (!isAdmin || u.username === username) return;
    e.preventDefault();
    setCtxMenu({ x: e.clientX, y: e.clientY, user: u });
  };

  return (
    <div className="sidebar">
      <div className="sidebar-top">
        <div className="sidebar-brand">💼 ChatApp</div>
        <div className="room-badge">
          <span className="room-hash">ROOM CODE - </span> {room}
        </div>
        <div className="users-section">
          <div style={{ display: 'flex', alignItems: 'center', marginBottom: '0.6rem' }}>
            <p className="users-label" style={{ margin: 0, flex: 1 }}>MEMBERS — {users.length}</p>
            <button
              className="member-search-btn"
              onClick={() => { setMemberSearchOpen(v => !v); setMemberSearch(''); }}
              title="Search members"
            >🔍</button>
          </div>
          {memberSearchOpen && (
            <input
              className="sidebar-join-input"
              style={{ marginBottom: '0.4rem', width: '100%' }}
              autoFocus
              placeholder="Search members..."
              value={memberSearch}
              onChange={(e) => setMemberSearch(e.target.value)}
            />
          )}
          <ul>
            {[...users]
              .sort((a, b) => (b.username === username) - (a.username === username))
              .filter(u => !memberSearch || u.username.toLowerCase().includes(memberSearch.toLowerCase()))
              .map((u) => (
              <li
                key={u.id || u.username}
                onContextMenu={(e) => handleRightClick(e, u)}
                title={isAdmin && u.username !== username ? 'Right-click for admin options' : ''}
                style={{ cursor: isAdmin && u.username !== username ? 'context-menu' : 'default' }}
              >
                <div className="avatar">{getInitial(u.username)}</div>
                <span style={{ flex: 1 }}>
                  {u.username} {u.username === username ? <em>(you)</em> : ''}
                  {u.isAdmin && <span className="admin-crown" title="Room Admin">👑 Admin</span>}
                </span>
                <span className={u.active ? 'badge-online' : 'badge-offline'}>
                  {u.active ? 'active' : 'inactive'}
                </span>
                {isAdmin && u.username !== username && (
                  <button
                    className="user-admin-btn"
                    title={u.isAdmin ? 'Remove Admin' : 'Make Admin'}
                    onClick={(e) => { e.stopPropagation(); u.isAdmin ? onRemoveAdmin(u.username) : onMakeAdmin(u.username); }}
                  >{u.isAdmin ? '✕' : '👑'}</button>
                )}
              </li>
            ))}
          </ul>
        </div>
      </div>

      <div className="sidebar-bottom">
        <div className="sidebar-join">
          <div className="sidebar-join-row">
            <input
              className="sidebar-join-input"
              placeholder="Join a room..."
              value={newRoom}
              maxLength={50}
              onChange={(e) => { setNewRoom(e.target.value); handleSearch(e.target.value); }}
              onKeyDown={(e) => e.key === 'Enter' && joinRoom()}
            />
            <button className="sidebar-join-btn" onClick={() => joinRoom()}>+</button>
          </div>
          {searchResults.length > 0 && (
            <ul className="sidebar-search-results">
              {searchResults.map(r => (
                <li key={r} onClick={() => joinRoom(r)}>
                  <span className="room-item-hash">#</span>
                  <span style={{ flex: 1 }}>{r}</span>
                  <span className="search-join-tag">Join</span>
                </li>
              ))}
            </ul>
          )}
        </div>
        <div className="my-rooms">
          <p className="users-label">MY ROOMS — {myRooms.length}</p>
          <input
            className="sidebar-join-input"
            style={{ marginBottom: '0.5rem' }}
            placeholder="🔍 Search my rooms..."
            value={myRoomsFilter}
            onChange={(e) => setMyRoomsFilter(e.target.value)}
          />
          <ul className="my-rooms-list" tabIndex="0" aria-label="My rooms">
            {myRooms.length === 0 && <li className="no-rooms">No rooms yet</li>}
            {myRooms.filter(r => r.toLowerCase().includes(myRoomsFilter.toLowerCase())).map((r) => {
              const pending = requestsForRoom(r);
              return (
                <li
                  key={r}
                  className={`room-item ${r === room ? 'active-room' : ''}`}
                  onClick={() => r !== room && onSwitchRoom(r)}
                >
                  <span className="room-item-hash">#</span>
                  <span className="room-item-name" title={r}>{r}</span>
                  {pending.length > 0 && <span className="room-request-badge">{pending.length}</span>}
                  <span className="room-info-btn" title="Join requests"
                    onClick={(e) => { e.stopPropagation(); setInfoRoom(infoRoom === r ? null : r); }}>ℹ</span>
                  <span className="room-leave-btn" title="Leave room"
                    onClick={(e) => { e.stopPropagation(); onLeaveRoom(r); }}>✕</span>
                </li>
              );
            })}
          </ul>
        </div>
        <button className="leave-btn" onClick={onLeave}>🚪 Leave Room</button>
        <button className="logout-btn" onClick={onLogout}>⏻ Sign Out</button>
      </div>

      {/* Join Request Popup */}
      {infoRoom && (
        <div className="join-req-overlay" onClick={() => setInfoRoom(null)}>
          <div className="join-req-popup" onClick={(e) => e.stopPropagation()}>
            <div className="join-req-header">
              <span>Join Requests — #{infoRoom}</span>
              <button className="join-req-close" onClick={() => setInfoRoom(null)}>✕</button>
            </div>
            {requestsForRoom(infoRoom).length === 0 ? (
              <p className="join-req-empty">No pending requests</p>
            ) : (
              <ul className="join-req-list">
                {requestsForRoom(infoRoom).map((req) => (
                  <li key={req.socketId} className="join-req-item">
                    <div className="join-req-avatar">{req.username.charAt(0).toUpperCase()}</div>
                    <span className="join-req-name">{req.username}</span>
                    <button className="join-req-approve" onClick={() => onApprove(req.socketId, req.room)}>Approve</button>
                    <button className="join-req-decline" onClick={() => onReject(req.socketId, req.room)}>Decline</button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}

      {/* Right-click context menu — rendered via portal to escape sidebar overflow */}
      {ctxMenu && createPortal(
        <div
          ref={ctxRef}
          className="ctx-menu"
          style={{ top: ctxMenu.y, left: ctxMenu.x }}
        >
          <div className="ctx-menu-title">{ctxMenu.user.username}</div>
          {!ctxMenu.user.isAdmin ? (
            <button className="ctx-menu-item" onClick={() => { onMakeAdmin(ctxMenu.user.username); setCtxMenu(null); }}>
              👑 Make Admin
            </button>
          ) : (
            <button className="ctx-menu-item ctx-danger" onClick={() => { onRemoveAdmin(ctxMenu.user.username); setCtxMenu(null); }}>
              ✕ Remove Admin
            </button>
          )}
        </div>,
        document.body
      )}
    </div>
  );
}

export default Sidebar;
