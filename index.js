const express = require('express');
const http = require('http');
const cors = require('cors');
const { Server }= require('socket.io');
require('dotenv').config();

const connectDB = require('./config/db');
const authRoutes = require('./routes/auth');   
const documentRoutes = require('./routes/documents');
const socketHandler= require('./socket/socketHandler');

const app = express();
const server = http.createServer(app);


const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET','POST'],
  }
})

// Middleware
app.use(cors({ origin: process.env.CLIENT_URL }));
app.use(express.json());

// Connect database
connectDB();


// Routes auth
app.use('/api/auth', authRoutes);

// Routes documents
app.use('/api/documents', documentRoutes);


// Health route
app.get('/health', (req, res) => {
  res.json({ status: 'ok', message: 'Server is running' });
});


// socket io
socketHandler(io);

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

