import { io } from "socket.io-client";

export const audioSocket = io("http://localhost:5000", {
  autoConnect: false,
  transports: ["websocket", "polling"],
});

audioSocket.on("connect", () => {
  console.log("Audio signaling connected:", audioSocket.id);
});

audioSocket.on("connect_error", (error) => {
  console.error("Audio signaling connection failed:", error.message);
});

audioSocket.on("disconnect", (reason) => {
  console.log("Audio signaling disconnected:", reason);
});