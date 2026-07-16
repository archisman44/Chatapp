# Real-Time Chat Application

> A room-based real-time chat application built with React, Node.js, Express, Socket.IO, and MySQL.

ChatApp combines REST APIs for persistent data with Socket.IO for low-latency room activity. Users can register, sign in, create or join rooms, invite registered users, request access to active rooms, exchange encrypted messages, see typing and read status, manage room membership, and switch among their saved rooms.

## 1. Presentation summary

### Core value

- Real-time room communication without a page refresh.
- Persistent history and room memberships.
- Controlled access to active rooms through admin approval or direct invitations.
- Browser-side AES-GCM encryption of message text before it leaves the client.
- A clear separation between UI, API/controller, database-model, and real-time socket responsibilities.

### Technology stack

| Layer | Technology | Responsibility |
| --- | --- | --- |
| Front end | React 19, Create React App, plain CSS | Screens, state management, REST calls, Socket.IO client, encryption/decryption |
| Real-time transport | Socket.IO | Presence, room joins, messages, typing, deletion, reactions, receipts, admin changes |
| Back end | Node.js, Express 5 | REST API, validation, application orchestration |
| Data | MySQL with `mysql2` | Accounts, memberships, messages, invitations, reactions, receipts |
| Security helpers | `bcryptjs`, Web Crypto API | Password hashing; PBKDF2 and AES-GCM message encryption |
| Configuration | `dotenv`, CORS | Environment configuration and local-client access |

## 2. Features implemented

### Account and session features

- Register with a unique username and email address.
- Sign in with email and password.
- Passwords are hashed with bcrypt before storage.
- Forgot-password and reset-password flow using a one-hour reset token.
- Browser session restoration with `sessionStorage` (`chatUser`).
- A lobby is shown after login when no room is active.

### Room and membership features

- Create a new room or join an existing room from the lobby/sidebar.
- Persist a user’s saved rooms in MySQL.
- Restore a user’s first saved room after a refresh when needed.
- Search existing rooms with a debounced, 300 ms REST request.
- Filter saved rooms in the UI.
- Show active/inactive members and their admin status.
- Leave the active room or remove a saved room — both actions disconnect the socket and redirect the user to the Lobby (the user stays logged in with `room: null`).
- Sign out clears the session entirely.
- First member becomes room admin; an active room automatically promotes another active member if all existing admins leave/disconnect.
- Existing admins may promote or remove other admins using the member context menu.

### Controlled access and invitations

- A new user attempting to enter a room with an active admin is placed in a pending-approval state.
- Active admins receive a live join request and can approve or reject it.
- Approved members retain access on reconnect because their membership is persisted.
- Any registered user can be invited by username from the invite dialog.
- Accepting an invitation persists membership before the browser joins, then uses a direct-join socket event to bypass the approval gate.

### Messaging experience

- Send and receive messages instantly within a Socket.IO room.
- Persist normal messages and system join/leave notifications.
- Fetch history when a room is ready.
- Restrict a new member’s history to messages created after their original `joined_at` timestamp.
- Group consecutive messages from the same sender and scroll the timeline to the latest message.
- Search currently loaded, decrypted messages in the browser.
- Typing indicators for other room members.
- Soft-delete a message; the author or a current room admin can trigger deletion from the UI.
- Persist read receipts and display per-message “seen by” information to a message sender.

### Encryption

- The browser derives a room-specific AES-GCM-256 key from the room name with PBKDF2-SHA-256 (100,000 iterations).
- Each message uses a new random 12-byte IV and is base64 encoded before it is sent.
- The server persists and broadcasts ciphertext rather than message plaintext.
- Messages are decrypted only in participating browsers; a failed decryption displays a safe placeholder.

> Important: this is browser-side encryption, but the room name is the only shared key material and the salt is fixed. It is useful for this project demonstration, but it is not a production-grade end-to-end encryption design. See [Security and production considerations](#12-security-and-production-considerations).

## 3. Project structure

```text
CHATAPP/
├── README.md
├── client/
│   ├── public/                         # HTML shell and static React assets
│   ├── src/
│   │   ├── components/
│   │   │   ├── Join.js                 # Register, login, and password reset screens
│   │   │   ├── Lobby.js                # Create/join room and invitation entry point
│   │   │   ├── Sidebar.js              # Members, rooms, room search, admin controls
│   │   │   ├── InviteModal.js          # Invite search, inbox, accept/decline flow
│   │   │   ├── ChatWindow.js           # Timeline, search, delete and seen-info UI
│   │   │   └── MessageInput.js         # Composer, emoji picker, typing notifications
│   │   ├── App.js                      # Client state, REST/socket lifecycle, orchestration
│   │   ├── App.css                     # Shared application styles
│   │   ├── crypto.js                   # PBKDF2/AES-GCM helpers
│   │   └── index.js                    # React bootstrap
│   └── package.json
└── server/
    ├── config/db.js                    # MySQL connection pool
    ├── controllers/
    │   ├── authController.js           # Account and reset-token logic
    │   ├── inviteController.js         # Invitation REST logic
    │   └── messageController.js        # History, rooms, user search and receipts
    ├── models/messageModel.js          # Schema initialization and parameterized SQL
    ├── routes/
    │   ├── authRoutes.js               # /api/auth routes
    │   └── messageRoutes.js            # Chat, room, invite and user routes
    ├── index.js                        # Express + HTTP + Socket.IO bootstrap
    ├── socket.js                       # Live-event and in-memory presence logic
    └── package.json
```

## 4. Architecture

```text
┌───────────────────────────── React client ──────────────────────────────┐
│ Join / Lobby / Sidebar / ChatWindow / InviteModal / MessageInput        │
│ App.js: state + REST calls + Socket.IO listeners                         │
│ crypto.js: encrypt before send; decrypt after receive/history fetch      │
└───────────────────┬───────────────────────────────┬─────────────────────┘
                    │ HTTP/JSON                      │ Socket.IO events
                    ▼                                ▼
┌────────────────────────── Node.js server ───────────────────────────────┐
│ Express routes → controllers → messageModel.js                           │
│ Socket handler: roomUsers, roomAdmins, pendingRequests, typingUsers      │
└──────────────────────────────────────┬──────────────────────────────────┘
                                       ▼
                         ┌────────────────────────┐
                         │        MySQL           │
                         │ users, memberships,    │
                         │ messages, invites,     │
                         │ reactions, seen state  │
                         └────────────────────────┘
```

### Why two communication paths?

| REST API | Socket.IO |
| --- | --- |
| Durable reads and actions: authentication, message history, room lists, invites, user/room search, receipt details | Live state changes: joining, presence, messages, typing, join approval, deletion, reaction/receipt updates |
| Client initiates request and receives one response | Server can immediately push an event to other connected members |
| Backed by MySQL | Presence/admin/request state is held in server memory; some resulting events are also persisted |

This split prevents message history and login from depending on a permanently open socket, while keeping live chat responsive.

## 5. Database architecture

Tables are created automatically by `server/models/messageModel.js` at server startup. The application database must exist before startup.

### Entity relationship view

```text
users
 ├── username ────────< user_rooms >──────── room name
 ├── username ────────< messages >────────── room name
 ├── username ────────< room_invites >────── room name
 ├── username ────────< message_reactions >─ messages.id
 └── username ────────< message_seen >────── messages.id

messages (1) ───────< message_reactions (many)
messages (1) ───────< message_seen      (many)
```

### Tables and purpose

| Table | Main columns | Purpose and constraints |
| --- | --- | --- |
| `users` | `id`, `username`, `email`, `password`, `reset_token`, `reset_expires`, `created_at` | Registered accounts. Username and email are unique. Password stores a bcrypt hash. |
| `user_rooms` | `id`, `username`, `room`, `joined_at` | Durable room membership. `UNIQUE(username, room)` prevents duplicate memberships and preserves the first join time. |
| `messages` | `id`, `username`, `room`, `message`, `type`, `deleted`, `created_at` | Chat ciphertext or system notification. `deleted` implements soft deletion. |
| `room_invites` | `id`, `from_username`, `to_username`, `room`, `status`, `created_at` | Invitation inbox and its pending/accepted/declined state. The unique key prevents duplicate invite state for one recipient/room/status. |
| `message_reactions` | `id`, `message_id`, `username`, `emoji` | One emoji reaction per user per message; a later reaction replaces their previous emoji. `message_id` cascades on actual message deletion. |
| `message_seen` | `id`, `message_id`, `username`, `seen_at` | Idempotent read receipt. One user can mark a message seen once. |

### Important schema excerpts

```sql
CREATE TABLE IF NOT EXISTS user_rooms (
  id INT AUTO_INCREMENT PRIMARY KEY,
  username VARCHAR(50) NOT NULL,
  room VARCHAR(50) NOT NULL,
  joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY unique_user_room (username, room)
);

CREATE TABLE IF NOT EXISTS message_seen (
  id INT AUTO_INCREMENT PRIMARY KEY,
  message_id INT NOT NULL,
  username VARCHAR(50) NOT NULL,
  seen_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY unique_seen (message_id, username),
  FOREIGN KEY (message_id) REFERENCES messages(id) ON DELETE CASCADE
);
```

The membership uniqueness is central to the history rule: `INSERT IGNORE` means returning to a room does not overwrite `joined_at`, so the user sees messages since their original membership began.

## 6. REST API reference

Base URL: `http://localhost:5000`

### Authentication routes

| Method | Endpoint | Body | Purpose |
| --- | --- | --- | --- |
| `POST` | `/api/auth/register` | `{ username, email, password }` | Validates unique username/email, hashes password, creates account. |
| `POST` | `/api/auth/login` | `{ email, password }` | Verifies bcrypt hash and returns username/email. |
| `POST` | `/api/auth/forgot-password` | `{ email }` | Creates a reset token that expires after one hour. In this development implementation the token is returned in the response. |
| `POST` | `/api/auth/reset-password` | `{ token, newPassword }` | Validates an unexpired token, hashes and replaces password, clears token fields. |

### Chat, room, invite, and receipt routes

| Method | Endpoint | Purpose |
| --- | --- | --- |
| `GET` | `/api/messages/:room?username=:username` | Fetches eligible history, including reactions and seen usernames. |
| `GET` | `/api/messages/:room/search?q=:query&username=:username` | Searches persisted non-deleted message ciphertext. See caveat below. |
| `GET` | `/api/rooms/:username` | Returns saved room names ordered by `joined_at`. |
| `DELETE` | `/api/rooms/:username/:room` | Deletes durable membership for a room. |
| `GET` | `/api/search/:query` | Returns up to 20 distinct matching rooms that occur in `messages`. |
| `GET` | `/api/users?q=:query` | Lists matching registered users (up to 30), used by invitations. |
| `POST` | `/api/invites` | Creates an invitation from `{ fromUsername, toUsername, room }`. |
| `GET` | `/api/invites/:username` | Returns pending invitations for a recipient. |
| `PUT` | `/api/invites/respond` | Accepts `{ id, status }`, where status is `accepted` or `declined`. |
| `GET` | `/api/seen/:messageId` | Returns detailed seen rows (`username`, `seen_at`). |

> Because chat message text is encrypted before storage, the server-side `/messages/:room/search` query cannot meaningfully search the original plaintext. The visible message search in `ChatWindow.js` correctly searches already loaded/decrypted messages on the client.

## 7. Socket.IO event contract

The server has four in-memory maps in `socket.js`:

- `roomUsers[room]`: members and active status.
- `roomAdmins[room]`: a set of active admin socket IDs.
- `pendingRequests[room]`: new-user requests awaiting an admin decision.
- `typingUsers[room]`: usernames currently typing.

These maps reset when the Node.js server restarts. Durable membership and history are retained in MySQL.

| Direction | Event | Payload | Effect |
| --- | --- | --- | --- |
| Client → server | `joinRoom` | `{ username, room }` | Attempts the approval-aware join flow. |
| Client → server | `joinRoomDirect` | `{ username, room }` | Joins directly after accepting an invite. |
| Server → client | `waitingApproval` | none | Shows the pending approval screen. |
| Server → admin | `joinRequest` | `{ username, socketId, room }` | Adds a live request to an admin’s UI. |
| Client → server | `approveJoin` / `rejectJoin` | `{ socketId, room }` | Resolves a pending request. |
| Server → requester | `joinApproved` / `joinRejected` | none | Moves requester into chat or shows rejection. |
| Server → client | `roomReady` | none | Membership is saved; client may fetch filtered history. |
| Server → room | `onlineUsers` | `[{ id, username, active, isAdmin }]` | Refreshes member presence/admin badges. |
| Client → server | `sendMessage` | `{ username, room, message }` | Persists ciphertext and broadcasts to other members. |
| Server → others | `receiveMessage` | `{ id, username, message, created_at, reactions }` | Delivers ciphertext to be decrypted locally. |
| Server → sender | `messageSent` | `{ id }` | Matches the optimistic local message to its DB ID. |
| Client/server | `typing`, `stopTyping`, `typingUpdate` | username/room or username list | Drives typing indicator. |
| Client/server | `deleteMessage`, `messageDeleted` | message ID/room | Soft-deletes the DB record and updates connected clients. |
| Client/server | `addReaction`, `removeReaction`, updates | message ID, user, emoji, room | Persists/revokes a user’s reaction and broadcasts update. |
| Client/server | `markSeen`, `seenUpdated` | message ID, user, room | Stores a read receipt and notifies the room. |
| Client → server | `leaveRoom`, `signOut` | none | Leave removes durable membership; sign-out only marks live presence inactive. |
| Server → room | `notification` | text | Adds join, leave, and admin-change timeline notifications. |

## 8. Detailed working flows

### A. Authentication and lobby flow

```text
Register: Join.js → POST /api/auth/register → bcrypt hash → users table

Login: Join.js → POST /api/auth/login → bcrypt.compare → App.handleJoin(username, null)
                                                    ↓
                                      sessionStorage stores { username, room: null }
                                                    ↓
                                   App fetches saved rooms or shows Lobby.js
```

`App.js` makes the login identity available immediately, but does not open a room socket until a room is selected. This keeps account authentication separate from room membership.

### B. Room join and approval flow

```text
User selects a room
  ↓
App.connectSocket() derives room key, opens Socket.IO connection
  ↓
Client emits joinRoom { username, room }
  ↓
Server checks active members, active admins, and durable access
  ├─ First/empty room, returning member, or prior accepted invite
  │    ↓
  │  _doJoin(): socket.join → saveUserRoom → presence broadcast → roomReady
  │
  └─ Brand-new user while an active admin exists
       ↓
     pendingRequests[room] stores requester; admin receives joinRequest
       ↓
     approveJoin → _doJoin() → joinApproved
     rejectJoin  → joinRejected
```

The `_doJoin` helper is intentionally the common path. It guarantees the same ordering for ordinary joins and approvals: join socket room, save durable membership, notify the UI that rooms may be refreshed, update in-memory presence, then emit `roomReady`.

### C. History loading and visibility flow

```text
roomReady
  ↓
GET /api/messages/:room?username=<user>
  ↓
Controller reads user_rooms.joined_at
  ↓
SELECT messages WHERE room = ? AND created_at > joined_at
  ↓
Controller attaches reactions + seen usernames to every returned record
  ↓
Client decrypts normal messages; notifications are rendered as text
```

This creates WhatsApp-style join-time visibility: a new member does not retrieve earlier history. Because `joined_at` is not reset on a reconnect, a returning member gets the same permitted history range.

### D. Send-message flow

```text
MessageInput → App.handleSend(plaintext)
  ↓
crypto.encryptMessage(roomKey, plaintext)
  ├─ generate 12-byte random IV
  ├─ AES-GCM encrypt
  └─ prefix IV and base64 encode
  ↓
socket.emit('sendMessage', ciphertext)
  ↓
Server: INSERT INTO messages (...) → socket.to(room).emit('receiveMessage')
  ↓                                                      ↓
Sender appends plaintext optimistically          Recipients decrypt and append plaintext
  ↓
messageSent returns DB ID, letting sender attach reactions/receipts later
```

### E. Read receipt flow

```text
Messages change in App.js
  ↓
For each received non-notification message not yet seen by this user
  ↓
socket.emit('markSeen', { messageId, username, room })
  ↓
INSERT IGNORE INTO message_seen → room-wide seenUpdated event
  ↓
Sender opens message-info dialog → GET /api/seen/:messageId
```

`seenEmittedRef` prevents the same browser session from repeatedly sending a receipt for one message.

### F. Leave room / lobby redirect flow

```text
User clicks 🚪 Leave Room  OR  clicks ✕ (red cross) on the active room in MY ROOMS
  ↓
App emits leaveRoom to server, disconnects socket
  ↓
sessionStorage updated to { username, room: null }
  ↓
setUser({ username, room: null })  →  App renders Lobby
  ↓
User sees "Hey, {username}! You're not in any room yet."
They can create/join a room or view invitations without signing out.
```

Removing a non-active room from MY ROOMS only deletes the durable membership via `DELETE /api/rooms/:username/:room` and does not affect the current socket connection.

### G. Invitation flow

```text
InviteModal searches GET /api/users?q=...
  ↓
POST /api/invites stores pending invitation
  ↓
Recipient opens Invite inbox → GET /api/invites/:username
  ↓
Accept → PUT /api/invites/respond { id, status: 'accepted' }
  ↓
Server saves user_rooms membership before switching sockets
  ↓
App.handleDirectJoin(room) emits joinRoomDirect
```

The explicit database save before `joinRoomDirect` prevents an accepted invite from being lost if the recipient refreshes after accepting it.

## 9. Key code examples

### Browser-side encryption (`client/src/crypto.js`)

```js
const iv = window.crypto.getRandomValues(new Uint8Array(12));
const cipher = await window.crypto.subtle.encrypt(
  { name: 'AES-GCM', iv }, key, new TextEncoder().encode(plaintext)
);

const combined = new Uint8Array(iv.byteLength + cipher.byteLength);
combined.set(iv);
combined.set(new Uint8Array(cipher), iv.byteLength);
return btoa(String.fromCharCode(...combined));
```

The IV is non-secret but must be unique/unpredictable for AES-GCM; storing it before the ciphertext allows the recipient to decrypt the message.

### Safe membership insertion (`server/models/messageModel.js`)

```js
const saveUserRoom = (username, room) =>
  db.query(
    'INSERT IGNORE INTO user_rooms (username, room) VALUES (?, ?)',
    [username, room.slice(0, 100)]
  );
```

The database unique key provides the real protection. `INSERT IGNORE` is idempotent, so reconnecting does not create a duplicate row or alter the first membership timestamp.

### Optimistic sender update (`client/src/App.js`)

```js
socket.emit('sendMessage', { username: user.username, room: user.room, message: ciphertext });
setMessages((prev) => [...prev, {
  username: user.username, message, created_at: new Date(), reactions: [], seenBy: []
}]);
```

The sender sees their message immediately. When the server responds with `messageSent`, the client finds the most recent local message without an ID and attaches its persistent ID.

## 10. Setup and execution

### Prerequisites

- Node.js and npm.
- A running MySQL server.
- Local ports `3000` (React) and `5000` (Node server) available.

### 1. Create a database

```sql
CREATE DATABASE chatapp;
```

### 2. Configure the server

Create `server/.env` (do not commit it):

```env
PORT=5000
DB_HOST=127.0.0.1
DB_PORT=3306
DB_USER=root
DB_PASSWORD=your_mysql_password
DB_NAME=chatapp
```

Install and start the API:

```bash
cd server
npm install
npm start
```

At startup, the server connects to MySQL and creates/updates the required tables.

### 3. Start the client

In another terminal:

```bash
cd client
npm install
npm start
```

Open `http://localhost:3000`. Register two accounts and use separate browser profiles/incognito windows to demonstrate messaging, access approval, invitations, typing, and receipts.

### Scripts

| Directory | Command | Purpose |
| --- | --- | --- |
| `server` | `npm start` | Starts Express and Socket.IO. |
| `client` | `npm start` | Starts React development server. |
| `client` | `npm run build` | Creates a production client build. |
| `client` | `npm test` | Runs Create React App tests. |

## 11. Demonstration checklist

For a project presentation, this sequence shows the major architecture clearly:

1. Register two accounts and log in as the first user.
2. Create a room; explain that the first active member becomes the admin.
3. Open the same room with a second account; show the waiting state and the admin’s approval request.
4. Approve the request and show the live member list/presence update.
5. Send messages from both browser windows; explain the client encryption → socket → database → recipient decryption path.
6. Show typing indicator, read receipt information, and a soft-deleted message.
7. Invite another registered account; accept the invitation and show direct access to the room.
8. Refresh a browser to show saved room/session recovery.
9. Explain MySQL persistence versus in-memory state: messages and memberships survive a server restart; live presence, pending requests, and current admins do not.

## 12. Security and production considerations

The code is a strong educational prototype, but the following changes are needed before production deployment:

- **Authentication authorization:** Login returns identity but no signed session/JWT exists. REST endpoints and many socket events trust client-supplied usernames/room/message IDs. Add authenticated middleware and socket handshake verification; enforce server-side ownership/admin checks for delete, reactions, room operations, and invitation authority.
- **Encryption design:** A room-name-derived key is guessable for predictable room names. Use a random per-room key, authenticated key distribution, key rotation, member removal/rekeying, and a reviewed protocol such as Signal-style group encryption for real E2EE.
- **Password reset:** Never return reset tokens in a public response. Persist a hashed token, send a single-use link via email, throttle requests, and use a short expiry.
- **Transport/deployment:** Use HTTPS/WSS, environment-specific CORS origins, rate limits, input validation, secure headers, logging, and monitoring.
- **Scalability:** Socket presence maps are process-local. Use a Socket.IO adapter (for example Redis) and shared room/admin/request state when scaling to multiple server processes.
- **Data performance:** The history controller executes reaction and seen queries once per message. Batch queries or use joins for larger histories; add indexes for frequent `(room, created_at)` queries.
- **Message search:** Server-side SQL `LIKE` cannot search encrypted plaintext. Keep search local after decryption or use a deliberately designed encrypted-search approach with its security trade-offs.
- **Feature completion note:** Socket handlers and database support reactions, but the current `ChatWindow` does not render reaction controls/badges. The feature needs UI wiring to be user-visible.

## Author

**Archisman Chakraborty**  
Software Developer Intern  
Developed as a Software Developer Internship POC assignment.
