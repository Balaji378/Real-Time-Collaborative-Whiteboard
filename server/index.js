const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const cors = require("cors");

const app = express();
app.use(cors());

const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: "*", // Allow connections from anywhere
    methods: ["GET", "POST"],
  },
});

// 📖 THE PHONEBOOK: Maps "username" -> "socketId"
const connectedUsers = {};

// 🏠 ROOMS: Maps "roomId" -> { owner: "username", history: [] }
const rooms = {
  "general": { owner: "System", history: [] }
};

io.on("connection", (socket) => {
  console.log(`Socket Connected: ${socket.id}`);

  // 1. REGISTRATION: User attempts to log in
  socket.on("register", (username) => {
    if (connectedUsers[username]) {
      // ❌ FAIL: Username is taken
      socket.emit("registration_error", "Username is already taken. Try another.");
    } else {
      // ✅ SUCCESS: Register them
      connectedUsers[username] = socket.id;
      socket.username = username; // Store on socket for cleanup later
      console.log(`Registered: ${username}`);
      socket.emit("registration_success");
    }
  });

  // 2. JOIN ROOM (Enhanced)
  socket.on("join_room", (roomId) => {
    socket.join(roomId);
    console.log(`${socket.username} joined room: ${roomId}`);

    // Create room if it doesn't exist
    if (!rooms[roomId]) {
      rooms[roomId] = {
        owner: socket.username,
        history: []
      };
      console.log(`Room created: ${roomId} by ${socket.username}`);
    }

    // Send room info (owner)
    socket.emit("room_info", {
      roomId,
      owner: rooms[roomId].owner
    });

    // Send drawing history
    if (rooms[roomId].history.length > 0) {
      socket.emit("load_history", rooms[roomId].history);
    }
  });

  // 3. DRAWING & CLEARING (With History)
  socket.on("draw_data", (data) => {
    const { roomId } = data;
    if (rooms[roomId]) {
      rooms[roomId].history.push(data);
    }
    socket.to(roomId).emit("draw_data", data);
  });

  socket.on("clear_board", (roomId) => {
    if (rooms[roomId]) {
      rooms[roomId].history = [];
    }
    io.to(roomId).emit("clear_board");
  });

  // 4. CHAT MESSAGES
  socket.on("send_message", (data) => {
    const { roomId, message, user } = data;
    io.to(roomId).emit("receive_message", { user, message, timestamp: new Date().toISOString() });
  });

  // 5. DISCONNECT: Clean up the phonebook
  socket.on("disconnect", () => {
    if (socket.username) {
        delete connectedUsers[socket.username];
        console.log(`User ${socket.username} disconnected`);
    }
  });
});

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
  console.log(`SERVER RUNNING ON PORT ${PORT}`);
});