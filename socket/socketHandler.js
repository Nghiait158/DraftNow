require('dotenv').config();
const jwt = require('jsonwebtoken');
const Document = require('../models/Document');

const activeUsers = new Map();

const socketHandler = (io) => {

  io.use((socket, next) => {
    try {
      const token = socket.handshake.auth.token;

      if (!token) {
        return next(new Error('No token provided'));
      }

      const decoded = jwt.verify(token, process.env.JWT_SECRET); 
      socket.userId = decoded.id;
      next();

    } catch (error) {
      console.error('Token error:', error.message);
      next(new Error('Invalid Token'));
    }
  });

  io.on('connection', (socket) => {
    console.log(`User connected: ${socket.userId} | Socket: ${socket.id}`); 

    socket.on('join-document', async ({ docId, user }) => {
      try {
        const document = await Document.findById(docId)
          .populate('owner', 'name email'); 

        if (!document) {
          socket.emit('error', { message: 'Document not found' });
          return;
        }

        if (!document.canView(socket.userId)) {
          socket.emit('error', { message: 'Access denied' });
          return;
        }

        socket.join(docId);
        socket.currentDocId = docId;

        if (!activeUsers.has(docId)) {
          activeUsers.set(docId, new Map());
        }

        activeUsers.get(docId).set(socket.id, {
          userId: socket.userId,
          name: user?.name || 'Anonymous',
          email: user?.email || '',
          socketId: socket.id,
        });

        console.log(`User ${socket.userId} joined document ${docId}`); 

        socket.emit('load-document', document);

        const usersInDoc = Array.from(activeUsers.get(docId).values());
        io.to(docId).emit('users-in-document', usersInDoc);

      } catch (error) {
        console.error('Error in join-document:', error);
        socket.emit('error', { message: 'Server error' });
      }
    });

    socket.on('send-changes', ({ docId, delta }) => {
      socket.to(docId).emit('receive-changes', delta);
    });

    socket.on('save-document', async ({ docId, content }) => {
      try {
        await Document.findByIdAndUpdate(docId, { content });
        console.log(`Document ${docId} saved`); 
      } catch (error) {
        console.error('Error saving document:', error);
      }
    });

    socket.on('leave-document', ({ docId }) => {
      handleLeaveDocument(socket, io, docId);
    });

    socket.on('disconnect', () => {
      console.log(`User disconnected: ${socket.userId} | Socket: ${socket.id}`); 
      if (socket.currentDocId) {
        handleLeaveDocument(socket, io, socket.currentDocId); 
      }
    });
  });
};

const handleLeaveDocument = (socket, io, docId) => {
  socket.leave(docId);

  if (activeUsers.has(docId)) {
    activeUsers.get(docId).delete(socket.id);

    if (activeUsers.get(docId).size === 0) {
      activeUsers.delete(docId);
    } else {
      const usersInDoc = Array.from(activeUsers.get(docId).values());
      io.to(docId).emit('users-in-document', usersInDoc);
    }
  }

  console.log(`User ${socket.userId} left document ${docId}`);
};

module.exports = socketHandler;