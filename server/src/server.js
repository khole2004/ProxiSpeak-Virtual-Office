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
    origin: true, credentials: true,
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
    origin: true, credentials: true,
    methods: ["GET", "POST"],
  },
});

// Store the latest avatar position for each connected participant.
const participantPositions = new Map();

// Join an audio room
io.on("connection", (socket) => {
  console.log("Participant connected:", socket.id);

  socket.on("join-audio-room", (roomId) => {
    if (typeof roomId !== "string" || !roomId.trim()) {
      return;
    }

    // Avoid duplicate room joins.
    if (socket.rooms.has(roomId)) {
      return;
    }

    socket.join(roomId);

    const participants = [
      ...(io.sockets.adapter.rooms.get(roomId) || []),
    ].filter((id) => id !== socket.id);

    // Send existing participant IDs to the new participant.
    socket.emit("audio-room-participants", participants);

    // Send positions already known for participants in this room.
    const existingPositions = participants
      .map((participantId) => {
        const saved = participantPositions.get(participantId);

        if (!saved || saved.roomId !== roomId) {
          return null;
        }

        return {
          participantId,
          position: saved.position,
          displayName: saved.displayName,
        };
      })
      .filter(Boolean);

    socket.emit(
      "existing-avatar-positions",
      existingPositions
    );

    // Notify existing participants about the new participant.
    socket.to(roomId).emit(
      "audio-participant-joined",
      socket.id
    );

    console.log(`${socket.id} joined room: ${roomId}`);
  });

  // Synchronize and store avatar positions.
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

      // Keep positions within the workspace boundaries.
      const safePosition = {
        x: Math.max(0, Math.min(1000, position.x)),
        y: Math.max(0, Math.min(600, position.y)),
      };

      const safeDisplayName =
        typeof displayName === "string" &&
        displayName.trim()
          ? displayName.trim().slice(0, 30)
          : "Teammate";

      // Save the latest position for future participants.
      participantPositions.set(socket.id, {
        roomId,
        position: safePosition,
        displayName: safeDisplayName,
      });

      // Broadcast the update to other participants in this room.
      socket.to(roomId).emit("avatar-position-update", {
        participantId: socket.id,
        displayName: safeDisplayName,
        position: safePosition,
      });
    }
  );

  // WebRTC offer
  socket.on("webrtc-offer", ({ targetId, offer } = {}) => {
    if (!targetId || !offer) {
      return;
    }

    io.to(targetId).emit("webrtc-offer", {
      senderId: socket.id,
      offer,
    });
  });

  // WebRTC answer
  socket.on("webrtc-answer", ({ targetId, answer } = {}) => {
    if (!targetId || !answer) {
      return;
    }

    io.to(targetId).emit("webrtc-answer", {
      senderId: socket.id,
      answer,
    });
  });

  // WebRTC ICE candidate
  socket.on(
    "webrtc-ice-candidate",
    ({ targetId, candidate } = {}) => {
      if (!targetId || !candidate) {
        return;
      }

      io.to(targetId).emit("webrtc-ice-candidate", {
        senderId: socket.id,
        candidate,
      });
    }
  );

  // --- [Member D Added]: Speaking Animation Event ---
  socket.on("speaking", ({ roomId, isSpeaking }) => {
    socket.to(roomId).emit("user-speaking", {
      participantId: socket.id,
      isSpeaking,
    });
  });

  // --- [Member D Added]: Mute Status Event ---
  socket.on("toggle-mute", ({ roomId, isMuted }) => {
    socket.to(roomId).emit("user-mute-status", {
      participantId: socket.id,
      isMuted,
    });
  });

  // Notify room participants when someone disconnects.
  socket.on("disconnecting", () => {
    for (const roomId of socket.rooms) {
      if (roomId !== socket.id) {
        socket.to(roomId).emit(
          "audio-participant-left",
          socket.id
        );
      }
    }
  });

  // Clean up stored positions when the participant disconnects.
  socket.on("disconnect", () => {
    participantPositions.delete(socket.id);

    console.log("Participant disconnected:", socket.id);
  });
});

// Start server only after MongoDB connects.
const PORT = process.env.PORT || 5000;

async function startServer() {
  httpServer.listen(PORT, () => {
    console.log(
      "ProxiSpeak server running at http://localhost:5000"
    );
  });

  if (process.env.MONGODB_URI) {
    try {
      await mongoose.connect(process.env.MONGODB_URI, {
        serverSelectionTimeoutMS: 2500,
      });
      console.log("MongoDB connected successfully.");
    } catch (error) {
      console.warn("MongoDB offline (running in local mode):", error.message);
    }
  }
}

startServer();



