const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const http = require('http');
const socketIo = require('socket.io');
const cookieParser = require('cookie-parser');   // ⭐ IMPORTANT
require('dotenv').config();

const authRoutes = require('./routes/auth');
const gdRoutes = require('./routes/gd');
const adminRoutes = require('./routes/admin');
const realtimeInterviewRoutes = require('./routes/realtimeInterview');
const evaluationRoutes = require('./routes/evaluation');
const blockchainRoutes = require('./routes/blockchain');
const GD = require('./models/GD');

const app = express();
const server = http.createServer(app);

const allowedOrigins = [
  process.env.FRONTEND_URL,
  'http://localhost:3000',
  'https://vision-meet-tau.vercel.app'
].filter(Boolean);

const io = socketIo(server, {
  cors: {
    origin: (origin, callback) => {
      if (!origin) return callback(null, true);
      if (
        allowedOrigins.includes(origin) ||
        /\.vercel\.app$/.test(origin)
      ) return callback(null, true);
      callback(new Error('Not allowed by CORS'));
    },
    methods: ['GET', 'POST'],
    credentials: true
  }
});

app.use(cors({
  origin: (origin, callback) => {
    if (!origin) return callback(null, true);
    if (
      allowedOrigins.includes(origin) ||
      /\.vercel\.app$/.test(origin)
    ) return callback(null, true);
    callback(new Error('Not allowed by CORS'));
  },
  credentials: true
}));

app.use(express.json());
app.use(cookieParser());   // ⭐ REQUIRED for OTP login if using cookies

// Health check - keeps Render from sleeping
app.get('/health', (req, res) => res.json({ status: 'ok', timestamp: new Date().toISOString() }));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/gd', gdRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/realtime-interview', realtimeInterviewRoutes);
app.use('/api/evaluation', evaluationRoutes);
app.use('/api/blockchain', blockchainRoutes);

// Socket.IO events
io.on('connection', (socket) => {
  console.log('User connected:', socket.id);

  socket.on('join-room', ({ roomId, userName }) => {
    socket.join(roomId);
    socket.data.userName = userName;
    socket.data.roomId = roomId;
    // Notify existing users in room about new user
    socket.to(roomId).emit('user-joined', { socketId: socket.id, userName });
    console.log(`${userName} joined room ${roomId}`);
  });

  socket.on('offer', ({ to, offer, userName }) => {
    socket.to(to).emit('offer', { from: socket.id, offer, userName });
  });

  socket.on('answer', ({ to, answer }) => {
    socket.to(to).emit('answer', { from: socket.id, answer });
  });

  socket.on('ice-candidate', ({ to, candidate }) => {
    socket.to(to).emit('ice-candidate', { from: socket.id, candidate });
  });

  socket.on('send-message', (data) => {
    // Broadcast to everyone in room INCLUDING sender for consistency
    io.to(data.roomId).emit('receive-message', data);
  });

  socket.on('leave-room', async (roomId) => {
    socket.to(roomId).emit('user-left', { socketId: socket.id });
    socket.leave(roomId);
    const roomSockets = await io.in(roomId).fetchSockets();
    if (roomSockets.length === 0) {
      await GD.findOneAndUpdate(
        { roomId: roomId, isActive: true },
        { isActive: false }
      );
      console.log(`Auto-closed empty GD session: ${roomId}`);
    }
  });

  socket.on('disconnect', async () => {
    console.log('User disconnected:', socket.id);
    const roomId = socket.data.roomId;
    if (roomId) {
      socket.to(roomId).emit('user-left', { socketId: socket.id });
      const roomSockets = await io.in(roomId).fetchSockets();
      if (roomSockets.length === 0) {
        await GD.findOneAndUpdate(
          { roomId, isActive: true },
          { isActive: false }
        );
      }
    }
  });
});

// MongoDB connection
mongoose.connect(process.env.MONGODB_URI)
  .then(() => console.log('MongoDB connected successfully'))
  .catch(err => {
    console.log('MongoDB connection error:', err.message);
    console.log('Please ensure MongoDB is running on your system');
  });

// Start server
const PORT = process.env.PORT || 5001;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
