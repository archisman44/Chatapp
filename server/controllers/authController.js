const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const { createUser, findUserByEmail, findUserByUsername, setResetToken, getUserByResetToken, updatePassword } = require('../models/messageModel');

const register = async (req, res) => {
  const { username, email, password } = req.body;
  if (!username || !email || !password) return res.status(400).json({ error: 'All fields required' });
  try {
    const [existing] = await findUserByUsername(username);
    if (existing.length > 0) return res.status(409).json({ error: 'Username already taken' });
    const [existingEmail] = await findUserByEmail(email);
    if (existingEmail.length > 0) return res.status(409).json({ error: 'Email already registered' });
    const hashed = await bcrypt.hash(password, 10);
    await createUser(username, email, hashed);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Registration failed' });
  }
};

const login = async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ error: 'All fields required' });
  try {
    const [rows] = await findUserByEmail(email);
    if (rows.length === 0) return res.status(401).json({ error: 'Invalid credentials' });
    const user = rows[0];
    const match = await bcrypt.compare(password, user.password);
    if (!match) return res.status(401).json({ error: 'Invalid credentials' });
    res.json({ success: true, username: user.username, email: user.email });
  } catch (err) {
    res.status(500).json({ error: 'Login failed' });
  }
};

const forgotPassword = async (req, res) => {
  const { email } = req.body;
  if (!email) return res.status(400).json({ error: 'Email required' });
  try {
    const [rows] = await findUserByEmail(email);
    if (rows.length === 0) return res.status(404).json({ error: 'Email not found' });
    const token = crypto.randomBytes(32).toString('hex');
    const expires = Date.now() + 3600000; // 1 hour
    await setResetToken(email, token, expires);
    // In production send email; here we return token for dev convenience
    res.json({ success: true, resetToken: token, message: 'Use the resetToken to reset your password' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to process request' });
  }
};

const resetPassword = async (req, res) => {
  const { token, newPassword } = req.body;
  if (!token || !newPassword) return res.status(400).json({ error: 'Token and new password required' });
  try {
    const [rows] = await getUserByResetToken(token);
    if (rows.length === 0) return res.status(400).json({ error: 'Invalid or expired token' });
    const hashed = await bcrypt.hash(newPassword, 10);
    await updatePassword(rows[0].id, hashed);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Reset failed' });
  }
};

module.exports = { register, login, forgotPassword, resetPassword };
