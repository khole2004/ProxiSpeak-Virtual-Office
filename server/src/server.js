
const express = require("express");
const http = require("http");
const cors = require("cors");
const mongoose = require("mongoose");
const { Server } = require("socket.io");
require("dotenv").config();

const authRoutes = require("../routes/auth");

const app = express();
const httpServer = http.createServer(app);

// Middleware
app.use(
  cors({
    origin: [
      "http://localhost:5173",
      "http://localhost:5174",
    ],
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE"],
  })
);

app.use(express.json({ limit: "10kb" }));

// Authentication routes
app.use("/api/auth", authRoutes);

// Health check
app.get("/", (req, res) => {
  res.json({
    message: "Welcome to the ProxiSpeak API!",
    status: "running",
  });
});

// Socket.IO setup
const io = new Server(httpServer, {
  cors: {
    origin: [
      "http://localhost:5173",
      "http://localhost:5174",
    ],
    methods: ["GET", "POST"],
  },
});

// Join an audio room
io.on("connection", (socket) => {
  console.log("Participant connected:", socket.id);

  socket.on("join-audio-room", (roomId) => {
    if (typeof roomId !== "string" || !roomId.trim()) {
      return;
    }

    socket.join(roomId);

    const participants = [
      ...(io.sockets.adapter.rooms.get(roomId) || []),
    ].filter((id) => id !== socket.id);

    socket.emit("audio-room-participants", participants);
    socket.to(roomId).emit("audio-participant-joined", socket.id);

    console.log(`${socket.id} joined room: ${roomId}`);
  });

  // Synchronize avatar positions
  socket.on(
    "avatar-position-update",
    ({ roomId, position, displayName } = {}) => {
      if (
        typeof roomId !== "string" ||
        !socket.rooms.has(roomId) ||
        !position ||
        !Number.isFinite(position.x) ||
        !Number.isFinite(position.y)
      ) {
        return;
      }

      const x = Math.max(0, Math.min(1000, position.x));
      const y = Math.max(0, Math.min(600, position.y));

      socket.to(roomId).emit("avatar-position-update", {
        participantId: socket.id,
        displayName:
          typeof displayName === "string"
            ? displayName.trim().slice(0, 30)
            : "Teammate",
        position: { x, y },
      });
    }
  );

  // WebRTC offer
  socket.on("webrtc-offer", ({ targetId, offer } = {}) => {
    if (!targetId || !offer) return;

    io.to(targetId).emit("webrtc-offer", {
      senderId: socket.id,
      offer,
    });
  });

  // WebRTC answer
  socket.on("webrtc-answer", ({ targetId, answer } = {}) => {
    if (!targetId || !answer) return;

    io.to(targetId).emit("webrtc-answer", {
      senderId: socket.id,
      answer,
    });
  });

  // WebRTC ICE candidate
  socket.on(
    "webrtc-ice-candidate",
    ({ targetId, candidate } = {}) => {
      if (!targetId || !candidate) return;

      io.to(targetId).emit("webrtc-ice-candidate", {
        senderId: socket.id,
        candidate,
      });
    }
  );

  // Notify room participants when someone disconnects
  socket.on("disconnecting", () => {
    for (const roomId of socket.rooms) {
      if (roomId !== socket.id) {
        socket.to(roomId).emit("audio-participant-left", socket.id);
      }
    }
  });

  socket.on("disconnect", () => {
    console.log("Participant disconnected:", socket.id);
  });
});

// Start server only after MongoDB connects
const PORT = process.env.PORT || 5000;

async function startServer() {
  try {
    if (!process.env.MONGODB_URI) {
      throw new Error("MONGODB_URI is missing from .env");
    }

    if (!process.env.JWT_SECRET) {
      throw new Error("JWT_SECRET is missing from .env");
    }

    await mongoose.connect(process.env.MONGODB_URI);
    console.log("MongoDB connected successfully.");

    httpServer.listen(PORT, () => {
      console.log(`ProxiSpeak server running at http://localhost:${PORT}`);
    });
  } catch (error) {
    console.error("Server startup failed:", error.message);
    process.exit(1);
  }
}

startServer();
