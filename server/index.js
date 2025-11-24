const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');

const app = express();
app.use(cors());

const server = http.createServer(app);

// Allow any connection (Simple for StackBlitz)
const io = new Server(server, {
  cors: {
    origin: '*',
  },
});

io.on('connection', (socket) => {
  console.log(`User Connected: ${socket.id}`);

  socket.on('join_room', (roomId) => {
    socket.join(roomId);
  });

  socket.on('draw_data', (data) => {
    socket.to(data.roomId).emit('draw_data', data);
  });

  socket.on('clear_board', (roomId) => {
    // Tell everyone else in the room to clear their canvas
    io.to(roomId).emit('clear_board');
  });
});

// StackBlitz usually runs Node on port 3000 or 3001
server.listen(3001, () => {
  console.log('SERVER RUNNING ON PORT 3001');
});
