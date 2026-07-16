const { createInvite, getPendingInvites, getInviteById, updateInviteStatus, saveUserRoom, findUserByUsername } = require('../models/messageModel');

const sendInvite = async (req, res) => {
  const { fromUsername, toUsername, room } = req.body;
  if (!fromUsername || !toUsername || !room) return res.status(400).json({ error: 'All fields required' });
  try {
    const [rows] = await findUserByUsername(toUsername);
    if (rows.length === 0) return res.status(404).json({ error: 'User not found' });
    await createInvite(fromUsername, toUsername, room);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed to send invite' });
  }
};

const getInvites = async (req, res) => {
  const { username } = req.params;
  try {
    const [rows] = await getPendingInvites(username);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch invites' });
  }
};

const respondInvite = async (req, res) => {
  const { id, status } = req.body;
  if (!id || !['accepted', 'declined'].includes(status)) return res.status(400).json({ error: 'Invalid request' });
  try {
    const [invites] = await getInviteById(id);
    if (invites.length === 0) return res.status(404).json({ error: 'Invite not found' });

    const invite = invites[0];
    await updateInviteStatus(id, status);
    // Accepting an invitation grants durable membership before the client changes
    // sockets, so a refresh cannot send this user back through admin approval.
    if (status === 'accepted') await saveUserRoom(invite.to_username, invite.room);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed to update invite' });
  }
};

module.exports = { sendInvite, getInvites, respondInvite };
