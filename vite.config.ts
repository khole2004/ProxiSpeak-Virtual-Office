import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  build: {
    // The office (three.js) is a separate lazy chunk on purpose; it only loads after joining a room.
    chunkSizeWarningLimit: 700,
  },
});
