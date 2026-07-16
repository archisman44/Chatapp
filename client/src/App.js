import { useState, useEffect, useCallback, useRef } from 'react';
import { io } from 'socket.io-client';
import Join from './components/Join';
import Sidebar from './components/Sidebar';
import ChatWindow from './components/ChatWindow';
import MessageInput from './components/MessageInput';
import { deriveRoomKey, encryptMessage, decryptMessage } from './crypto';
import InviteModal from './components/InviteModal';
import Lobby from './components/Lobby';
import './App.css';

const SOCKET_URL = process.env.REACT_APP_SERVER_URL || 'http://localhost:5000';

function App() {
  const [socket, setSocket] = useState(null);
  const [user, setUser] = useState(() => {
    const saved = sessionStorage.getItem('chatUser');
    return saved ? JSON.parse(saved) : null;
  });
  const [messages, setMessages] = useState([]);
  const [onlineUsers, setOnlineUsers] = useState([]);
  const [myRooms, setMyRooms] = useState([]);
  const [isRestoringRooms, setIsRestoringRooms] = useState(Boolean(user));
  const [joinStatus, setJoinStatus] = useState(null);
  const [joinRequests, setJoinRequests] = useState([]);
  const [typingUsers, setTypingUsers] = useState([]);
  const activeUsername = user?.username;

  const roomKeyRef = useRef(null);
  const socketRef = useRef(null);
  const seenEmittedRef = useRef(new Set());

  const connectSocket = useCallback(async (username, room, existingSocket = null, direct = false) => {
    if (existingSocket) {
      existingSocket.emit('signOut');
      existingSocket.disconnect();
    }

    const roomKey = await deriveRoomKey(room);
    roomKeyRef.current = roomKey;

    const s = io(SOCKET_URL, { transports: ['websocket'] });
    socketRef.current = s;

    const fetchHistory = async () => {
      const r = await fetch(`${SOCKET_URL}/api/messages/${room}?username=${encodeURIComponent(username)}`);
      const history = await r.json();
      const decrypted = await Promise.all(
        history.map(async (m) => {
          if (m.type === 'notification') return { type: 'notification', text: m.message };
          try {
            const plain = await decryptMessage(roomKey, m.message);
            return { ...m, message: plain };
          } catch {
            return { ...m, message: '🔒 [Unable to decrypt]' };
          }
        })
      );
      setMessages(decrypted);
    };

    s.on('connect', () => s.emit(direct ? 'joinRoomDirect' : 'joinRoom', { username, room }));
    s.on('roomReady', fetchHistory);

    s.on('waitingApproval', () => setJoinStatus('waiting'));
    s.on('joinApproved', () => setJoinStatus(null));
    s.on('joinRejected', () => setJoinStatus('rejected'));

    s.on('joinRequest', ({ username: reqUser, socketId, room: reqRoom }) => {
      setJoinRequests((prev) => [...prev, { username: reqUser, socketId, room: reqRoom }]);
    });

    s.on('receiveMessage', async (msg) => {
      try {
        const plain = await decryptMessage(roomKey, msg.message);
        setMessages((prev) => [...prev, { ...msg, message: plain }]);
      } catch {
        setMessages((prev) => [...prev, { ...msg, message: '🔒 [Unable to decrypt]' }]);
      }
    });

    // sender gets message id back to update local message
    s.on('messageSent', ({ id }) => {
      setMessages((prev) => {
        const copy = [...prev];
        // find last message by this user without an id
        for (let i = copy.length - 1; i >= 0; i--) {
          if (copy[i].username === username && !copy[i].id) {
            copy[i] = { ...copy[i], id };
            break;
          }
        }
        return copy;
      });
    });

    s.on('onlineUsers', (users) => setOnlineUsers(users));
    s.on('notification', (text) =>
      setMessages((prev) => [...prev, { type: 'notification', text }])
    );
    s.on('roomSaved', () => {
      fetch(`${SOCKET_URL}/api/rooms/${username}`)
        .then((r) => r.json())
        .then((rooms) => setMyRooms((prev) => {
          if (rooms.length > prev.length) return rooms;
          return prev;
        }));
    });

    // Typing
    s.on('typingUpdate', (users) => setTypingUsers(users));

    // Delete
    s.on('messageDeleted', ({ messageId }) => {
      setMessages((prev) => prev.map((m) =>
        m.id === messageId ? { ...m, deleted: 1 } : m
      ));
    });

    // Reactions
    s.on('reactionUpdated', ({ messageId, username: rUser, emoji }) => {
      setMessages((prev) => prev.map((m) => {
        if (m.id !== messageId) return m;
        const reactions = (m.reactions || []).filter((r) => r.username !== rUser);
        return { ...m, reactions: [...reactions, { username: rUser, emoji }] };
      }));
    });

    s.on('reactionRemoved', ({ messageId, username: rUser }) => {
      setMessages((prev) => prev.map((m) => {
        if (m.id !== messageId) return m;
        return { ...m, reactions: (m.reactions || []).filter((r) => r.username !== rUser) };
      }));
    });

    // Seen
    s.on('seenUpdated', ({ messageId, username: seenUser }) => {
      setMessages((prev) => prev.map((m) => {
        if (m.id !== messageId) return m;
        const seen = m.seenBy || [];
        if (seen.includes(seenUser)) return m;
        return { ...m, seenBy: [...seen, seenUser] };
      }));
    });

    setSocket(s);
    return s;
  }, []);

  useEffect(() => {
    if (!activeUsername) return;
    let s;
    let cancelled = false;
    setIsRestoringRooms(true);

    const restoreSavedRoom = async () => {
      try {
        const response = await fetch(`${SOCKET_URL}/api/rooms/${activeUsername}`);
        const rooms = await response.json();
        if (cancelled || !Array.isArray(rooms)) return;

        setMyRooms(rooms);
        const savedUser = JSON.parse(sessionStorage.getItem('chatUser') || 'null');
        const savedRoom = savedUser?.username === activeUsername ? savedUser.room : null;
        // A logged-in user belongs in chat when they have saved rooms. Keep the
        // current room when possible; otherwise restore their first saved room.
        const roomToOpen = rooms.includes(savedRoom) ? savedRoom : rooms[0];
        if (!roomToOpen) return;

        if (roomToOpen !== savedRoom) {
          const restoredUser = { username: activeUsername, room: roomToOpen };
          sessionStorage.setItem('chatUser', JSON.stringify(restoredUser));
          setUser(restoredUser);
        }
        s = await connectSocket(activeUsername, roomToOpen);
      } catch {
        // If the room lookup fails, leave the user on the lobby so they can retry.
      } finally {
        if (!cancelled) setIsRestoringRooms(false);
      }
    };

    restoreSavedRoom();
    return () => { cancelled = true; s?.disconnect(); };
    // Room changes are connected by the explicit room-switch handlers below.
  }, [activeUsername, connectSocket]);

  // Mark messages as seen when they arrive
  useEffect(() => {
    if (!user || !socket) return;
    messages.forEach((m) => {
      if (m.id && m.username !== user.username && m.type !== 'notification' && !m.deleted) {
        const alreadySeen = m.seenBy?.includes(user.username);
        if (!alreadySeen && !seenEmittedRef.current.has(m.id)) {
          seenEmittedRef.current.add(m.id);
          socket.emit('markSeen', { messageId: m.id, username: user.username, room: user.room });
        }
      }
    });
  }, [messages, user, socket]);

  const handleJoin = useCallback((username, room) => {
    sessionStorage.setItem('chatUser', JSON.stringify({ username, room }));
    setUser({ username, room });
    setIsRestoringRooms(!room);
    setJoinStatus(null);
    if (room) connectSocket(username, room);
  }, [connectSocket]);

  const handleSwitchRoom = useCallback((newRoom) => {
    if (!user) return;
    sessionStorage.setItem('chatUser', JSON.stringify({ username: user.username, room: newRoom }));
    setUser({ username: user.username, room: newRoom });
    setOnlineUsers([]);
    setMessages([]);
    setJoinStatus(null);
    setTypingUsers([]);
    seenEmittedRef.current = new Set();
    connectSocket(user.username, newRoom, socket);
  }, [user, socket, connectSocket]);

  // Used when accepting an invite — bypasses admin approval
  const handleDirectJoin = useCallback((newRoom) => {
    if (!user) return;
    sessionStorage.setItem('chatUser', JSON.stringify({ username: user.username, room: newRoom }));
    setUser({ username: user.username, room: newRoom });
    setOnlineUsers([]);
    setMessages([]);
    setJoinStatus(null);
    setTypingUsers([]);
    seenEmittedRef.current = new Set();
    connectSocket(user.username, newRoom, socket, true);
  }, [user, socket, connectSocket]);

  const handleSend = async (message) => {
    const roomKey = roomKeyRef.current;
    if (!roomKey) return;
    const ciphertext = await encryptMessage(roomKey, message);
    socket.emit('sendMessage', { username: user.username, room: user.room, message: ciphertext });
    setMessages((prev) => [...prev, {
      username: user.username,
      message,
      created_at: new Date(),
      reactions: [],
      seenBy: [],
    }]);
  };

  const handleTyping = useCallback(() => {
    socket?.emit('typing', { username: user.username, room: user.room });
  }, [socket, user]);

  const handleStopTyping = useCallback(() => {
    socket?.emit('stopTyping', { username: user.username, room: user.room });
  }, [socket, user]);

  const handleDeleteMessage = useCallback((messageId) => {
    socket?.emit('deleteMessage', { messageId, room: user.room });
  }, [socket, user]);

  const handleReaction = useCallback((messageId, emoji) => {
    const msg = messages.find((m) => m.id === messageId);
    const existing = msg?.reactions?.find((r) => r.username === user.username);
    if (existing && existing.emoji === emoji) {
      socket?.emit('removeReaction', { messageId, username: user.username, room: user.room });
    } else {
      socket?.emit('addReaction', { messageId, username: user.username, emoji, room: user.room });
    }
  }, [socket, user, messages]);

  const handleMakeAdmin = useCallback((targetUsername) => {
    socket?.emit('makeAdmin', { targetUsername, room: user.room });
  }, [socket, user]);

  const handleRemoveAdmin = useCallback((targetUsername) => {
    socket?.emit('removeAdmin', { targetUsername, room: user.room });
  }, [socket, user]);

  const handleLeave = useCallback(() => {
    socket?.emit('leaveRoom');
    socket?.disconnect();
    const username = user?.username;
    sessionStorage.setItem('chatUser', JSON.stringify({ username, room: null }));
    setSocket(null); setMessages([]); setOnlineUsers([]);
    setJoinRequests([]); setTypingUsers([]); setJoinStatus(null);
    setUser({ username, room: null });
  }, [socket, user]);

  const handleLogout = useCallback(() => {
    socket?.emit('signOut');
    socket?.disconnect();
    sessionStorage.removeItem('chatUser');
    setSocket(null); setUser(null); setMessages([]);
    setOnlineUsers([]); setJoinRequests([]); setTypingUsers([]);
  }, [socket]);

  const handleLeaveRoom = useCallback((roomToLeave) => {
    if (roomToLeave === user.room) socket?.emit('leaveRoom');
    fetch(`${SOCKET_URL}/api/rooms/${user.username}/${roomToLeave}`, { method: 'DELETE' })
      .then(() => fetch(`${SOCKET_URL}/api/rooms/${user.username}`))
      .then((r) => r.json())
      .then((remaining) => {
        setMyRooms(remaining);
        if (roomToLeave === user.room) {
          const nextRoom = remaining[0];
          if (nextRoom) {
            handleSwitchRoom(nextRoom);
          } else {
            socket?.disconnect();
            const username = user.username;
            sessionStorage.setItem('chatUser', JSON.stringify({ username, room: null }));
            setSocket(null); setMessages([]); setOnlineUsers([]);
            setJoinRequests([]); setTypingUsers([]); setJoinStatus(null);
            setUser({ username, room: null });
          }
        }
      });
  }, [user, socket, handleSwitchRoom]);

  const handleApprove = useCallback((socketId, room) => {
    socket?.emit('approveJoin', { socketId, room });
    setJoinRequests((prev) => prev.filter((r) => r.socketId !== socketId));
  }, [socket]);

  const handleReject = useCallback((socketId, room) => {
    socket?.emit('rejectJoin', { socketId, room });
    setJoinRequests((prev) => prev.filter((r) => r.socketId !== socketId));
  }, [socket]);

  const handleGoHome = useCallback(() => {
    setSocket(null); setMessages([]);
    setOnlineUsers([]); setJoinRequests([]);
    setJoinStatus(null); setTypingUsers([]);
    const username = user?.username;
    const savedRoom = myRooms[0];
    if (username && savedRoom) {
      const restoredUser = { username, room: savedRoom };
      sessionStorage.setItem('chatUser', JSON.stringify(restoredUser));
      setUser(restoredUser);
      connectSocket(username, savedRoom, socket);
      return;
    }

    socket?.disconnect();
    sessionStorage.setItem('chatUser', JSON.stringify({ username, room: null }));
    setUser(username ? { username, room: null } : null);
  }, [socket, user, myRooms, connectSocket]);

  useEffect(() => () => socket?.disconnect(), [socket]);

  const [searchOpen, setSearchOpen] = useState(false);
  const [inviteOpen, setInviteOpen] = useState(false);

  if (!user || joinStatus === 'waiting' || joinStatus === 'rejected') {
    return <Join onJoin={handleJoin} joinStatus={joinStatus} onRetry={() => { setJoinStatus(null); if (user?.username && user?.room) connectSocket(user.username, user.room, socket); }} onGoHome={handleGoHome} />;
  }

  if (!user.room && isRestoringRooms) {
    return <div className="room-restore-screen">Opening your rooms…</div>;
  }

  // ── Lobby: logged in but not in any room yet ─────────────────────────────────
  if (!user.room) {
    return (
      <Lobby
        username={user.username}
        onJoinRoom={(room) => handleSwitchRoom(room)}
        onDirectJoin={handleDirectJoin}
        onLogout={handleLogout}
      />
    );
  }

  const isAdmin = onlineUsers.find((u) => u.username === user.username)?.isAdmin || false;

  return (
    <div className="app">
      <Sidebar
        room={user.room}
        users={onlineUsers}
        onLeave={handleLeave}
        username={user.username}
        myRooms={myRooms}
        onSwitchRoom={handleSwitchRoom}
        onLeaveRoom={handleLeaveRoom}
        onLogout={handleLogout}
        onJoinRoom={handleSwitchRoom}
        joinRequests={joinRequests}
        onApprove={handleApprove}
        onReject={handleReject}
        isAdmin={isAdmin}
        onMakeAdmin={handleMakeAdmin}
        onRemoveAdmin={handleRemoveAdmin}
      />
      <div className="chat-area">
        <div className="chat-header">
          <div className="chat-header-info">
            <span className="room-icon">🏠</span>
            <div>
              <h3>{user.room}</h3>
              <p>{onlineUsers.filter(u => u.active).length} online · {onlineUsers.length} members</p>
            </div>
          </div>
          <div className="chat-header-right">
            <span className="e2e-badge" title="End-to-end encrypted">🔒 E2E Encrypted</span>
            <button
              className="invite-header-btn"
              onClick={() => setInviteOpen(true)}
              title="Invite user to room"
            >👥</button>
            <button
              className="msg-search-toggle"
              onClick={() => setSearchOpen((v) => !v)}
              title="Search messages"
            >🔍 Search</button>
          </div>
        </div>
        {inviteOpen && (
          <InviteModal
            room={user.room}
            username={user.username}
            onClose={() => setInviteOpen(false)}
            onAcceptInvite={(invRoom) => { setInviteOpen(false); handleDirectJoin(invRoom); }}
          />
        )}
        <ChatWindow
          messages={messages}
          username={user.username}
          isAdmin={isAdmin}
          onDeleteMessage={handleDeleteMessage}
          onReaction={handleReaction}
          onlineUsers={onlineUsers}
          room={user.room}
          searchOpen={searchOpen}
          onCloseSearch={() => setSearchOpen(false)}
        />
        <MessageInput
          onSend={handleSend}
          onTyping={handleTyping}
          onStopTyping={handleStopTyping}
          typingUsers={typingUsers}
          username={user.username}
          socket={socket}
          room={user.room}
        />
      </div>
    </div>
  );
}

export default App;