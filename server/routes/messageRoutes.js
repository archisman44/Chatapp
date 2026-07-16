const express = require('express');
const router = express.Router();
const { getChatHistory, getMyRooms, leaveRoom, searchRoomsHandler, searchMessagesHandler, getSeenByHandler, getAllUsers } = require('../controllers/messageController');
const { sendInvite, getInvites, respondInvite } = require('../controllers/inviteController');

router.get('/messages/:room', getChatHistory);
router.get('/messages/:room/search', searchMessagesHandler);
router.get('/rooms/:username', getMyRooms);
router.delete('/rooms/:username/:room', leaveRoom);
router.get('/search/:query', searchRoomsHandler);
router.get('/seen/:messageId', getSeenByHandler);
router.get('/users', getAllUsers);
router.post('/invites', sendInvite);
router.get('/invites/:username', getInvites);
router.put('/invites/respond', respondInvite);

module.exports = router;
