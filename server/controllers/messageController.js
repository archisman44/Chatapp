const { getMessages, getUserRooms, deleteUserRoom, getJoinedAt, searchRooms, searchMessages, getReactions, getSeenBy, markSeen } = require('../models/messageModel');

const getChatHistory = async (req, res) => {
  const { room } = req.params;
  const { username } = req.query;
  try {
    let since = null;
    if (username) {
      const [rows] = await getJoinedAt(username, room);
      if (rows.length > 0) since = rows[0].joined_at;
    }
    const [messages] = await getMessages(room, since);
    // attach reactions to each message
    const withReactions = await Promise.all(messages.map(async (m) => {
      const [reactions] = await getReactions(m.id);
      const [seenBy] = await getSeenBy(m.id);
      return { ...m, reactions, seenBy: seenBy.map((s) => s.username) };
    }));
    res.json(withReactions);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch messages' });
  }
};

const searchMessagesHandler = async (req, res) => {
  const { room } = req.params;
  const { q, username } = req.query;
  if (!q || !q.trim()) return res.json([]);
  try {
    let since = null;
    if (username) {
      const [rows] = await getJoinedAt(username, room);
      if (rows.length > 0) since = rows[0].joined_at;
    }
    const [messages] = await searchMessages(room, q.trim(), since);
    res.json(messages);
  } catch (err) {
    res.status(500).json({ error: 'Failed to search messages' });
  }
};

const getMyRooms = async (req, res) => {
  const { username } = req.params;
  try {
    const [rows] = await getUserRooms(username);
    res.json(rows.map((r) => r.room));
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch rooms' });
  }
};

const leaveRoom = async (req, res) => {
  const { username, room } = req.params;
  try {
    await deleteUserRoom(username, room);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed to leave room' });
  }
};

const searchRoomsHandler = async (req, res) => {
  const { query } = req.params;
  try {
    const [rows] = await searchRooms(query);
    res.json(rows.map((r) => r.room));
  } catch (err) {
    res.status(500).json({ error: 'Failed to search rooms' });
  }
};

const getSeenByHandler = async (req, res) => {
  const { messageId } = req.params;
  try {
    const [rows] = await getSeenBy(messageId);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch seen info' });
  }
};

const getAllUsers = async (req, res) => {
  const { q } = req.query;
  try {
    const db = require('../config/db');
    let rows;
    if (q && q.trim()) {
      [rows] = await db.query(
        'SELECT username, email FROM users WHERE username LIKE ? OR email LIKE ? ORDER BY username ASC LIMIT 30',
        [`%${q.trim()}%`, `%${q.trim()}%`]
      );
    } else {
      [rows] = await db.query('SELECT username, email FROM users ORDER BY username ASC LIMIT 50');
    }
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch users' });
  }
};

module.exports = { getChatHistory, getMyRooms, leaveRoom, searchRoomsHandler, searchMessagesHandler, getSeenByHandler, getAllUsers };
