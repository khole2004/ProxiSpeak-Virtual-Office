
import React from "react";
import { createRoot } from "react-dom/client";
import App from "./App.jsx";
import AudioTest from "./AudioTest.jsx";

const isAudioTest =
  new URLSearchParams(window.location.search).get("audioTest") === "1";

createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    {isAudioTest ? <AudioTest /> : <App />}
  </React.StrictMode>
);
