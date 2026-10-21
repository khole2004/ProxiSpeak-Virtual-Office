import { useState } from "react";
import { startAudio, stopAudio } from "./services/audio/audioManager";

export default function AudioTest() {
  const [message, setMessage] = useState("Audio room not connected");
  const [connected, setConnected] = useState(false);

  async function handleStart() {
    try {
      setMessage("Requesting microphone permission...");

      await startAudio();

      setConnected(true);
      setMessage("Joined audio room. Waiting for other participants...");
    } catch (error) {
      console.error("Audio test failed:", error);
      setMessage(
        error.name === "NotAllowedError"
          ? "Microphone permission denied. Allow microphone access in your browser."
          : `Connection failed: ${error.message}`
      );
    }
  }

  function handleStop() {
    stopAudio();
    setConnected(false);
    setMessage("Audio room disconnected");
  }

  return (
    <div
      style={{
        minHeight: "100vh",
        padding: "32px",
        background: "#101827",
        color: "white",
        fontFamily: "Arial, sans-serif",
      }}
    >
      <h1>ProxiSpeak — Audio Test</h1>

      <p>{message}</p>

      <button onClick={handleStart} disabled={connected}>
        Join Audio Room
      </button>

      <button onClick={handleStop} disabled={!connected}>
        Leave Audio Room
      </button>

      <p style={{ marginTop: "20px", color: "#aab7ca" }}>
        Open this test on two devices or browser sessions to test voice
        communication. Use headphones to avoid audio feedback.
      </p>
    </div>
  );
}