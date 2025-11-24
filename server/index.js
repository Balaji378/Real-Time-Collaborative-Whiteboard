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

  // 2. SEND INVITE: Direct message logic
  socket.on("send_invite", (data) => {
    const { toUser, roomId } = data;
    const targetSocketId = connectedUsers[toUser];

    if (targetSocketId) {
      // Send the invite ONLY to the specific person
      io.to(targetSocketId).emit("receive_invite", {
        fromUser: socket.username,
        roomId: roomId
      });
    } else {
        // Optional: You could emit an error back to sender here
        console.log(`User ${toUser} is not online.`);
    }
  });

  // 3. JOIN ROOM (For private sessions)
  socket.on("join_room", (roomId) => {
    socket.join(roomId);
    console.log(`${socket.username} joined room: ${roomId}`);
  });

  // 4. DRAWING & CLEARING
  socket.on("draw_data", (data) => {
    socket.to(data.roomId).emit("draw_data", data);
  });

  socket.on("clear_board", (roomId) => {
    io.to(roomId).emit("clear_board");
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