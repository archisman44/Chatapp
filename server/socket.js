const { saveMessage, saveUserRoom, deleteUserRoom, deleteMessage, saveReaction, removeReaction, markSeen, hasRoomAccess } = require('./models/messageModel');

const roomUsers = {};
// multiple admins — { room: Set<socketId> }
const roomAdmins = {};
const pendingRequests = {};
// typing — { room: Set<username> }
const typingUsers = {};

const socketHandler = (io) => {
  io.on('connection', (socket) => {

    socket.on('joinRoom', async ({ username, room }) => {
      socket.username = username;
      socket.room = room;
      socket.intentionalLeave = false;

      if (!roomUsers[room]) roomUsers[room] = [];

      const activeMembers = roomUsers[room].filter((u) => u.active);
      // Socket IDs change on refresh/reconnect. Keep the admin set aligned with
      // currently active members before deciding where to send a join request.
      if (activeMembers.length > 0) _reassignAdmin(io, room);
      const activeAdminIds = activeMembers
        .filter((u) => roomAdmins[room]?.has(u.id))
        .map((u) => u.id);
      // A refresh replaces the socket and marks the prior entry inactive. A
      // previous room membership or an accepted invitation grants reconnect access.
      let alreadyMember = roomUsers[room].some((u) => u.username === username);
      if (!alreadyMember) {
        const [accessRows] = await hasRoomAccess(username, room);
        alreadyMember = accessRows.length > 0;
      }

      if (activeMembers.length > 0 && activeAdminIds.length > 0 && !alreadyMember) {
        if (!pendingRequests[room]) pendingRequests[room] = [];
        // Keep a pending request attached to the joining browser's latest socket.
        const existingRequest = pendingRequests[room].find((request) => request.username === username);
        if (existingRequest) {
          existingRequest.socketId = socket.id;
        } else {
          pendingRequests[room].push({ socketId: socket.id, username });
        }
        // Notify only connected admins; stale socket IDs cannot receive events.
        activeAdminIds.forEach((adminId) => {
          io.to(adminId).emit('joinRequest', { username, socketId: socket.id, room });
        });
        socket.emit('waitingApproval');
        return;
      }

      await _doJoin(socket, io, username, room);
      if (!roomAdmins[room] || roomAdmins[room].size === 0) {
        roomAdmins[room] = new Set([socket.id]);
      }
    });

    // Direct join — skips approval (used when accepting an invite)
    socket.on('joinRoomDirect', async ({ username, room }) => {
      socket.username = username;
      socket.room = room;
      socket.intentionalLeave = false;
      if (!roomUsers[room]) roomUsers[room] = [];
      await _doJoin(socket, io, username, room);
      if (!roomAdmins[room] || roomAdmins[room].size === 0) {
        roomAdmins[room] = new Set([socket.id]);
      }
    });

    socket.on('approveJoin', async ({ socketId, room }) => {
      if (!pendingRequests[room]) return;
      const idx = pendingRequests[room].findIndex((r) => r.socketId === socketId);
      if (idx === -1) return;
      const { username } = pendingRequests[room].splice(idx, 1)[0];
      const targetSocket = io.sockets.sockets.get(socketId);
      if (!targetSocket) return;
      targetSocket.username = username;
      targetSocket.room = room;
      targetSocket.intentionalLeave = false;
      await _doJoin(targetSocket, io, username, room);
      targetSocket.emit('joinApproved');
    });

    socket.on('rejectJoin', ({ socketId, room }) => {
      if (!pendingRequests[room]) return;
      pendingRequests[room] = pendingRequests[room].filter((r) => r.socketId !== socketId);
      const targetSocket = io.sockets.sockets.get(socketId);
      if (targetSocket) targetSocket.emit('joinRejected');
    });

    socket.on('sendMessage', async ({ username, room, message }) => {
      const msgId = await saveMessage(username, room, message);
      socket.to(room).emit('receiveMessage', { id: msgId, username, message, created_at: new Date(), reactions: [] });
      // sender's own message gets id back
      socket.emit('messageSent', { id: msgId });
    });

    // Typing indicators
    socket.on('typing', ({ username, room }) => {
      if (!typingUsers[room]) typingUsers[room] = new Set();
      typingUsers[room].add(username);
      socket.to(room).emit('typingUpdate', [...typingUsers[room]]);
    });

    socket.on('stopTyping', ({ username, room }) => {
      if (typingUsers[room]) {
        typingUsers[room].delete(username);
        socket.to(room).emit('typingUpdate', [...typingUsers[room]]);
      }
    });

    // Delete message (admin or own message)
    socket.on('deleteMessage', async ({ messageId, room }) => {
      await deleteMessage(messageId);
      io.to(room).emit('messageDeleted', { messageId });
    });

    // Emoji reaction
    socket.on('addReaction', async ({ messageId, username, emoji, room }) => {
      await saveReaction(messageId, username, emoji);
      io.to(room).emit('reactionUpdated', { messageId, username, emoji });
    });

    socket.on('removeReaction', async ({ messageId, username, room }) => {
      await removeReaction(messageId, username);
      io.to(room).emit('reactionRemoved', { messageId, username });
    });

    // Mark message as seen
    socket.on('markSeen', async ({ messageId, username, room }) => {
      await markSeen(messageId, username);
      io.to(room).emit('seenUpdated', { messageId, username });
    });

    // Make admin (existing admin promotes another user)
    socket.on('makeAdmin', ({ targetUsername, room }) => {
      if (!roomAdmins[room]) return;
      // check caller is admin
      const isAdmin = roomAdmins[room].has(socket.id);
      if (!isAdmin) return;
      const targetUser = roomUsers[room]?.find((u) => u.username === targetUsername);
      if (!targetUser) return;
      roomAdmins[room].add(targetUser.id);
      _emitOnlineUsers(io, room);
      io.to(room).emit('notification', `${targetUsername} is now an admin`);
    });

    // Remove admin
    socket.on('removeAdmin', ({ targetUsername, room }) => {
      if (!roomAdmins[room]) return;
      const isAdmin = roomAdmins[room].has(socket.id);
      if (!isAdmin) return;
      const targetUser = roomUsers[room]?.find((u) => u.username === targetUsername);
      if (!targetUser) return;
      roomAdmins[room].delete(targetUser.id);
      _emitOnlineUsers(io, room);
      io.to(room).emit('notification', `${targetUsername} is no longer an admin`);
    });

    socket.on('leaveRoom', async () => {
      socket.intentionalLeave = true;
      const { username, room } = socket;
      if (room && roomUsers[room]) {
        roomUsers[room] = roomUsers[room].filter((u) => u.username !== username);
        if (typingUsers[room]) typingUsers[room].delete(username);
        await deleteUserRoom(username, room);
        const text = `${username} left the room`;
        await saveMessage(username, room, text, 'notification');
        io.to(room).emit('notification', text);
        _reassignAdmin(io, room);
        _emitOnlineUsers(io, room);
      }
    });

    socket.on('signOut', () => {
      socket.intentionalLeave = true;
      const { username, room } = socket;
      if (room && roomUsers[room]) {
        const user = roomUsers[room].find((u) => u.username === username);
        if (user && user.id === socket.id) {
          user.active = false;
          if (typingUsers[room]) typingUsers[room].delete(username);
          _reassignAdmin(io, room);
          _emitOnlineUsers(io, room);
        }
      }
    });

    socket.on('disconnect', () => {
      const { username, room, intentionalLeave } = socket;
      if (!room || !roomUsers[room] || intentionalLeave) return;
      const user = roomUsers[room].find((u) => u.username === username);
      if (user && user.id === socket.id) {
        user.active = false;
        if (typingUsers[room]) typingUsers[room].delete(username);
        _reassignAdmin(io, room);
        _emitOnlineUsers(io, room);
      }
    });
  });
};

function _isAdmin(room, socketId) {
  return roomAdmins[room] && roomAdmins[room].has(socketId);
}

function _emitOnlineUsers(io, room) {
  const adminIds = roomAdmins[room] || new Set();
  const adminUsernames = new Set(
    roomUsers[room]?.filter((u) => adminIds.has(u.id)).map((u) => u.username) || []
  );
  const list = (roomUsers[room] || []).map((u) => ({
    ...u,
    isAdmin: adminUsernames.has(u.username),
  }));
  io.to(room).emit('onlineUsers', list);
}

async function _doJoin(socket, io, username, room) {
  socket.join(room);
  await saveUserRoom(username, room);
  socket.emit('roomSaved');

  const existing = roomUsers[room].find((u) => u.username === username);
  if (existing) {
    existing.id = socket.id;
    existing.active = true;
  } else {
    roomUsers[room].push({ id: socket.id, username, active: true });
    const text = `${username} joined the room`;
    await saveMessage(username, room, text, 'notification');
    io.to(room).emit('notification', text);
  }

  _emitOnlineUsers(io, room);
  socket.emit('roomReady');
}

function _reassignAdmin(io, room) {
  if (!roomUsers[room]) return;
  const active = roomUsers[room].filter((u) => u.active);
  if (active.length === 0) { roomAdmins[room] = new Set(); return; }
  if (!roomAdmins[room]) roomAdmins[room] = new Set();
  // remove dead socket ids from admin set
  const validIds = new Set(active.map((u) => u.id));
  for (const id of roomAdmins[room]) {
    if (!validIds.has(id)) roomAdmins[room].delete(id);
  }
  // if no admins left, promote first active
  if (roomAdmins[room].size === 0) {
    roomAdmins[room].add(active[0].id);
  }
}

module.exports = socketHandler;
