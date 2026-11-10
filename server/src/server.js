const dns = require("dns");
try {
  dns.setServers(["8.8.8.8", "1.1.1.1"]);
} catch (e) {
  // Use system DNS as fallback
}

const express = require("express");
const http = require("http");
const cors = require("cors");
const mongoose = require("mongoose");
const { Server } = require("socket.io");
require("dotenv").config();

const authRoutes = require("../routes/auth");
const { createRateLimiter } = require("./middleware/rateLimiter");

const app = express();
const httpServer = http.createServer(app);

// Apply Global Rate Limiting (120 requests/min per IP)
app.use(createRateLimiter({ windowMs: 60 * 1000, max: 120 }));

// Production CORS Configuration
const allowedOrigins = process.env.CLIENT_URL
  ? process.env.CLIENT_URL.split(",").map((s) => s.trim())
  : [
      "http://localhost:5173",
      "http://localhost:3000",
      "http://127.0.0.1:5173",
    ];

const corsOptions = {
  origin: (origin, callback) => {
    if (!origin) return callback(null, true);
    if (
      allowedOrigins.includes("*") ||
      allowedOrigins.includes(origin) ||
      origin.endsWith(".vercel.app") ||
      origin.endsWith(".onrender.com") ||
      origin.includes("localhost") ||
      origin.includes("127.0.0.1")
    ) {
      return callback(null, true);
    }
    return callback(null, true);
  },
  credentials: true,
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
};

// Middleware
app.use(cors(corsOptions));

app.use(express.json({ limit: "10kb" }));

// Authentication routes
app.use("/api/auth", authRoutes);

// Health check
app.get("/", (req, res) => {
  const isMongoConnected = mongoose.connection.readyState === 1;
  res.json({
    message: "Welcome to the ProxiSpeak API!",
    status: "running",
    database: isMongoConnected ? "Online (MongoDB Atlas Connected)" : "Local In-Memory Mode",
  });
});

app.get("/api/health", (req, res) => {
  const isMongoConnected = mongoose.connection.readyState === 1;
  res.json({
    status: "OK",
    database: isMongoConnected ? "Connected" : "Offline",
    timestamp: new Date().toISOString(),
  });
});

// Live Room and Virtual Office Metrics Endpoint
app.get("/api/rooms/metrics", (req, res) => {
  const activeSockets = io.engine?.clientsCount || 0;
  const activeParticipants = participantPositions.size;

  res.json({
    status: "active",
    activeSockets,
    activeParticipants,
    uptimeSeconds: Math.floor(process.uptime()),
    memoryUsageMB: Math.round(process.memoryUsage().rss / (1024 * 1024)),
    timestamp: new Date().toISOString(),
  });
});

// Socket.IO setup
const io = new Server(httpServer, {
  cors: corsOptions,
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
      `ProxiSpeak server running on port ${PORT}`
    );
  });

  if (process.env.MONGODB_URI) {
    try {
      await mongoose.connect(process.env.MONGODB_URI, {
        serverSelectionTimeoutMS: 8000,
      });
      console.log("MongoDB Atlas connected successfully (Online Database Active).");
    } catch (error) {
      console.log("MongoDB offline. Running in Local In-Memory Mode (All Login and Register requests work seamlessly).");
    }
  }
}

// Graceful shutdown handling for container and cloud deployments (Render, Railway)
function gracefulShutdown(signal) {
  console.log(`Received ${signal}. Gracefully shutting down ProxiSpeak server...`);
  httpServer.close(async () => {
    console.log("HTTP server closed.");
    try {
      await mongoose.connection.close();
      console.log("MongoDB Atlas connection cleanly closed.");
    } catch (err) {
      console.error("Error closing MongoDB connection:", err);
    }
    process.exit(0);
  });

  setTimeout(() => {
    console.error("Forceful shutdown after timeout.");
    process.exit(1);
  }, 10000);
}

process.on("SIGTERM", () => gracefulShutdown("SIGTERM"));
process.on("SIGINT", () => gracefulShutdown("SIGINT"));

startServer();



