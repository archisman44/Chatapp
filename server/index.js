require('dotenv').config();
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const messageRoutes = require('./routes/messageRoutes');
const authRoutes = require('./routes/authRoutes');
const socketHandler = require('./socket');

const app = express();
const server = http.createServer(app);
const ALLOWED_ORIGINS = [
  process.env.CLIENT_URL || 'http://localhost:3000',
  'http://localhost:3000',
];

const originFn = (origin, cb) => {
  if (!origin || ALLOWED_ORIGINS.includes(origin) || /\.trycloudflare\.com$/.test(origin))
    return cb(null, true);
  cb(new Error('Not allowed by CORS'));
};

const corsOptions = {
  origin: originFn,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type'],
  preflightContinue: false,
  optionsSuccessStatus: 204,
};

const io = new Server(server, { cors: corsOptions });

app.use(cors(corsOptions));
app.use(express.json());
app.use('/api/auth', authRoutes);
app.use('/api', messageRoutes);

socketHandler(io);  //register all socket events

const PORT = process.env.PORT || 5000; //  either / or
server.listen(PORT, () => console.log(`Server running on port ${PORT}`));