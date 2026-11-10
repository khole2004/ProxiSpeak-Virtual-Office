import { io } from "socket.io-client";

const SOCKET_URL =
  import.meta.env.VITE_SOCKET_URL ||
  import.meta.env.VITE_API_URL ||
  "http://localhost:5000";

export const audioSocket = io(SOCKET_URL, {
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
