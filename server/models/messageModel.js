const db = require('../config/db');

const createTable = async () => {
  // Users table
  try {
    await db.query(`
      CREATE TABLE IF NOT EXISTS users (
        id INT AUTO_INCREMENT PRIMARY KEY,
        username VARCHAR(50) NOT NULL UNIQUE,
        email VARCHAR(100) NOT NULL UNIQUE,
        password VARCHAR(255) NOT NULL,
        reset_token VARCHAR(100) DEFAULT NULL,
        reset_expires BIGINT DEFAULT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
  } catch (err) { console.error('users table failed:', err.message); }
  // Room invites table
  try {
    await db.query(`
      CREATE TABLE IF NOT EXISTS room_invites (
        id INT AUTO_INCREMENT PRIMARY KEY,
        from_username VARCHAR(50) NOT NULL,
        to_username VARCHAR(50) NOT NULL,
        room VARCHAR(50) NOT NULL,
        status ENUM('pending','accepted','declined') DEFAULT 'pending',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE KEY unique_invite (to_username, room, status)
      )
    `);
  } catch (err) { console.error('room_invites table failed:', err.message); }
  try {
    await db.query(`
      CREATE TABLE IF NOT EXISTS messages (
        id INT AUTO_INCREMENT PRIMARY KEY,
        username VARCHAR(100) NOT NULL,
        room VARCHAR(100) NOT NULL,
        message TEXT NOT NULL,
        type ENUM('message', 'notification') DEFAULT 'message',
        deleted TINYINT(1) DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
  } catch (err) { console.error('Table creation failed:', err.message); }
  try { await db.query(`ALTER TABLE messages ADD COLUMN type ENUM('message','notification') DEFAULT 'message'`); } catch (err) {}
  try { await db.query(`ALTER TABLE messages ADD COLUMN deleted TINYINT(1) DEFAULT 0`); } catch (err) {}
  try { await db.query(`ALTER TABLE messages MODIFY COLUMN room VARCHAR(100) NOT NULL`); } catch (err) {}
  try { await db.query(`ALTER TABLE messages MODIFY COLUMN username VARCHAR(100) NOT NULL`); } catch (err) {}
  try {
    await db.query(`
      CREATE TABLE IF NOT EXISTS user_rooms (
        id INT AUTO_INCREMENT PRIMARY KEY,
        username VARCHAR(50) NOT NULL,
        room VARCHAR(50) NOT NULL,
        joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE KEY unique_user_room (username, room)
      )
    `);
  } catch (err) { console.error('user_rooms table creation failed:', err.message); }
  try {
    await db.query(`
      CREATE TABLE IF NOT EXISTS message_reactions (
        id INT AUTO_INCREMENT PRIMARY KEY,
        message_id INT NOT NULL,
        username VARCHAR(50) NOT NULL,
        emoji VARCHAR(10) NOT NULL,
        UNIQUE KEY unique_reaction (message_id, username),
        FOREIGN KEY (message_id) REFERENCES messages(id) ON DELETE CASCADE
      )
    `);
  } catch (err) { console.error('reactions table failed:', err.message); }
  try {
    await db.query(`
      CREATE TABLE IF NOT EXISTS message_seen (
        id INT AUTO_INCREMENT PRIMARY KEY,
        message_id INT NOT NULL,
        username VARCHAR(50) NOT NULL,
        seen_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE KEY unique_seen (message_id, username),
        FOREIGN KEY (message_id) REFERENCES messages(id) ON DELETE CASCADE
      )
    `);
  } catch (err) { console.error('message_seen table failed:', err.message); }
};

createTable();

const saveMessage = async (username, room, message, type = 'message') => {
  const [result] = await db.query(
    'INSERT INTO messages (username, room, message, type) VALUES (?, ?, ?, ?)',
    [username.slice(0, 100), room.slice(0, 100), message, type]
  );
  return result.insertId;
};

const getMessages = (room, since = null) => {
  if (since) {
    return db.query(
      'SELECT id, username, message, type, deleted, created_at FROM messages WHERE room = ? AND created_at > ? ORDER BY created_at ASC',
      [room, since]
    );
  }
  return db.query(
    'SELECT id, username, message, type, deleted, created_at FROM messages WHERE room = ? ORDER BY created_at ASC',
    [room]
  );
};

const searchMessages = (room, query, since = null) => {
  if (since) {
    return db.query(
      'SELECT id, username, message, type, deleted, created_at FROM messages WHERE room = ? AND created_at > ? AND message LIKE ? AND type = ? AND deleted = 0 ORDER BY created_at ASC',
      [room, since, `%${query}%`, 'message']
    );
  }
  return db.query(
    'SELECT id, username, message, type, deleted, created_at FROM messages WHERE room = ? AND message LIKE ? AND type = ? AND deleted = 0 ORDER BY created_at ASC',
    [room, `%${query}%`, 'message']
  );
};

const deleteMessage = (id) => {
  return db.query('UPDATE messages SET deleted = 1 WHERE id = ?', [id]);
};

const getJoinedAt = (username, room) => {
  return db.query('SELECT joined_at FROM user_rooms WHERE username = ? AND room = ?', [username, room]);
};

// A user may enter a room after an admin approves a request or after accepting
// an invitation. Both records grant the same access on later reconnects.
const hasRoomAccess = (username, room) => {
  return db.query(
    `SELECT 1
     FROM user_rooms
     WHERE username = ? AND room = ?
     UNION
     SELECT 1
     FROM room_invites
     WHERE to_username = ? AND room = ? AND status = 'accepted'
     LIMIT 1`,
    [username, room, username, room]
  );
};

const saveUserRoom = (username, room) => {
  return db.query('INSERT IGNORE INTO user_rooms (username, room) VALUES (?, ?)', [username, room.slice(0, 100)]);
};

const getUserRooms = (username) => {
  return db.query('SELECT room FROM user_rooms WHERE username = ? ORDER BY joined_at ASC', [username]);
};

const deleteUserRoom = (username, room) => {
  return db.query('DELETE FROM user_rooms WHERE username = ? AND room = ?', [username, room]);
};

const searchRooms = (query) => {
  return db.query(
    'SELECT DISTINCT room FROM messages WHERE room LIKE ? ORDER BY room ASC LIMIT 20',
    [`%${query}%`]
  );
};

const saveReaction = (messageId, username, emoji) => {
  return db.query(
    'INSERT INTO message_reactions (message_id, username, emoji) VALUES (?, ?, ?) ON DUPLICATE KEY UPDATE emoji = ?',
    [messageId, username, emoji, emoji]
  );
};

const removeReaction = (messageId, username) => {
  return db.query('DELETE FROM message_reactions WHERE message_id = ? AND username = ?', [messageId, username]);
};

const getReactions = (messageId) => {
  return db.query('SELECT username, emoji FROM message_reactions WHERE message_id = ?', [messageId]);
};

const markSeen = (messageId, username) => {
  return db.query(
    'INSERT IGNORE INTO message_seen (message_id, username) VALUES (?, ?)',
    [messageId, username]
  );
};

const getSeenBy = (messageId) => {
  return db.query('SELECT username, seen_at FROM message_seen WHERE message_id = ?', [messageId]);
};

// Auth
const createUser = (username, email, hashedPassword) =>
  db.query('INSERT INTO users (username, email, password) VALUES (?, ?, ?)', [username, email, hashedPassword]);

const findUserByEmail = (email) =>
  db.query('SELECT * FROM users WHERE email = ?', [email]);

const findUserByUsername = (username) =>
  db.query('SELECT * FROM users WHERE username = ?', [username]);

const setResetToken = (email, token, expires) =>
  db.query('UPDATE users SET reset_token = ?, reset_expires = ? WHERE email = ?', [token, expires, email]);

const getUserByResetToken = (token) =>
  db.query('SELECT * FROM users WHERE reset_token = ? AND reset_expires > ?', [token, Date.now()]);

const updatePassword = (userId, hashedPassword) =>
  db.query('UPDATE users SET password = ?, reset_token = NULL, reset_expires = NULL WHERE id = ?', [hashedPassword, userId]);

// Invites
const createInvite = (fromUsername, toUsername, room) =>
  db.query('INSERT IGNORE INTO room_invites (from_username, to_username, room) VALUES (?, ?, ?)', [fromUsername, toUsername, room]);

const getPendingInvites = (toUsername) =>
  db.query("SELECT * FROM room_invites WHERE to_username = ? AND status = 'pending' ORDER BY created_at DESC", [toUsername]);

const getInviteById = (id) =>
  db.query('SELECT * FROM room_invites WHERE id = ?', [id]);

const updateInviteStatus = (id, status) =>
  db.query('UPDATE room_invites SET status = ? WHERE id = ?', [status, id]);

module.exports = {
  saveMessage, getMessages, searchMessages, deleteMessage,
  saveUserRoom, getUserRooms, deleteUserRoom, getJoinedAt, hasRoomAccess,
  searchRooms, saveReaction, removeReaction, getReactions,
  markSeen, getSeenBy,
  createUser, findUserByEmail, findUserByUsername,
  setResetToken, getUserByResetToken, updatePassword,
  createInvite, getPendingInvites, getInviteById, updateInviteStatus
};
