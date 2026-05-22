import {connectToDB} from './config/db.js';
import cors from 'cors';
import express from 'express';
import residentRouter from './routes/residentRoutes.js';
import authRouter from './routes/authRoutes.js';
import wardenRouter from './routes/wardenRoutes.js';
import messRouter from './routes/messRoutes.js';
import http from 'http';
import jwt from 'jsonwebtoken';
import { Server as SocketIOServer } from 'socket.io';

const app = express();
const PORT = 5000;

//connecting to DB
connectToDB();

//middlewares
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cors());

//api endpoints
app.use('/api/auth', authRouter);
app.use('/api/resident', residentRouter);
app.use('/api/warden', wardenRouter);
app.use('/api/mess', messRouter);
app.get('/api/test', (req, res)=>{
  res.json({message: "Server is working."});
});
//setting up port and socket.io server
const server = http.createServer(app);

const io = new SocketIOServer(server, {
  cors: {
    origin: '*',
    methods: ['GET','POST']
  }
});

// Namespace for resident chat
const residentNs = io.of('/resident-chat');

residentNs.use((socket, next) => {
  // Expect JWT token from client auth
  const token = socket.handshake.auth?.token;
  if (!token) return next(new Error('Unauthorized'));
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    socket.user = { id: decoded.id, role: decoded.role, name: decoded.name, hostelName: decoded.hostelName };
    if (decoded.role !== 'resident') return next(new Error('Forbidden'));
    return next();
  } catch (err) {
    return next(new Error('Unauthorized'));
  }
});

residentNs.on('connection', (socket) => {
  const { hostelName, id, name} = socket.user || {};
  const room = hostelName || 'lobby';
  socket.join(room);

  // Notify join
  residentNs.to(room).emit('presence', { type: 'join', userId: id });

  socket.on('message', (payload) => {
    // payload: { text }
    if (typeof payload?.text !== 'string' || !payload.text.trim()) return;
    residentNs.to(room).emit('message', {
      userId: id,
      userName: name,
      text: payload.text,
      ts: Date.now(),
    });
  });

  socket.on('disconnect', () => {
    residentNs.to(room).emit('presence', { type: 'leave', userId: id });
  });
});

server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

export default app;