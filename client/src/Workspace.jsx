
import { useCallback, useEffect, useRef, useState } from "react";
import "./style.css";

import { audioSocket } from "./services/audio/audioSocket";
import {
  startAudio,
  stopAudio,
  updateAudioPositions,
} from "./services/audio/audioManager";

const ROOM_ID = "proxispeak-main-room";
const INITIAL_POSITION = { x: 500, y: 460 };

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

export default function Workspace({ initialName = "" }) {
  const [name, setName] = useState(initialName);
  const [joined, setJoined] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  const [localPosition, setLocalPosition] = useState(INITIAL_POSITION);
  const [remoteIds, setRemoteIds] = useState([]);
  const [remotePositions, setRemotePositions] = useState({});
  const [remoteNames, setRemoteNames] = useState({});

  const officeRef = useRef(null);
  const draggingRef = useRef(false);
  const localPositionRef = useRef(INITIAL_POSITION);
  const nameRef = useRef(initialName);

  useEffect(() => {
    function handleParticipants(ids) {
      setRemoteIds(ids);

      const activeIds = new Set(ids);

      setRemotePositions((previous) =>
        Object.fromEntries(
          Object.entries(previous).filter(([id]) => activeIds.has(id))
        )
      );

      setRemoteNames((previous) =>
        Object.fromEntries(
          Object.entries(previous).filter(([id]) => activeIds.has(id))
        )
      );
    }

    function handleParticipantJoined(id) {
      setRemoteIds((previous) =>
        previous.includes(id) ? previous : [...previous, id]
      );
    }

    function handlePositionUpdate({
      participantId,
      position,
      displayName,
    } = {}) {
      if (
        !participantId ||
        !position ||
        !Number.isFinite(position.x) ||
        !Number.isFinite(position.y)
      ) {
        return;
      }

      setRemoteIds((previous) =>
        previous.includes(participantId)
          ? previous
          : [...previous, participantId]
      );

      setRemotePositions((previous) => ({
        ...previous,
        [participantId]: position,
      }));

      setRemoteNames((previous) => ({
        ...previous,
        [participantId]:
          typeof displayName === "string" && displayName.trim()
            ? displayName.trim().slice(0, 30)
            : previous[participantId] || "Teammate",
      }));
    }

    function handleParticipantLeft(id) {
      setRemoteIds((previous) =>
        previous.filter((participantId) => participantId !== id)
      );

      setRemotePositions((previous) => {
        const next = { ...previous };
        delete next[id];
        return next;
      });

      setRemoteNames((previous) => {
        const next = { ...previous };
        delete next[id];
        return next;
      });
    }

    audioSocket.on("audio-room-participants", handleParticipants);
    audioSocket.on("audio-participant-joined", handleParticipantJoined);
    audioSocket.on("avatar-position-update", handlePositionUpdate);
    audioSocket.on("audio-participant-left", handleParticipantLeft);

    return () => {
      audioSocket.off("audio-room-participants", handleParticipants);
      audioSocket.off("audio-participant-joined", handleParticipantJoined);
      audioSocket.off("avatar-position-update", handlePositionUpdate);
      audioSocket.off("audio-participant-left", handleParticipantLeft);
    };
  }, []);

  useEffect(() => {
    localPositionRef.current = localPosition;

    if (joined) {
      updateAudioPositions(localPosition, remotePositions);
    }
  }, [localPosition, remotePositions, joined]);

  async function joinRoom(event) {
    event.preventDefault();

    const displayName = name.trim();

    if (!displayName || busy || joined) return;

    nameRef.current = displayName;
    setBusy(true);
    setMessage("Connecting to your virtual office...");

    try {
      await startAudio();

      const position = INITIAL_POSITION;

      localPositionRef.current = position;
      setLocalPosition(position);
      setJoined(true);
      setMessage(`Connected as ${displayName}`);

      // Share your initial avatar position and display name.
      audioSocket.emit("avatar-position-update", {
        roomId: ROOM_ID,
        position,
        displayName,
      });
    } catch (error) {
      console.error("Could not join ProxiSpeak:", error);

      setMessage(
        error.name === "NotAllowedError"
          ? "Microphone access was denied. Allow microphone access and try again."
          : `Could not connect: ${error.message}`
      );
    } finally {
      setBusy(false);
    }
  }

  const leaveRoom = useCallback(() => {
    draggingRef.current = false;
    stopAudio();

    setJoined(false);
    setRemoteIds([]);
    setRemotePositions({});
    setRemoteNames({});
    setLocalPosition(INITIAL_POSITION);

    localPositionRef.current = INITIAL_POSITION;
    nameRef.current = "";

    setMessage("You have left the workspace.");
  }, []);

  function startDragging(event) {
    if (!joined) return;

    event.preventDefault();
    event.stopPropagation();

    draggingRef.current = true;

    try {
      event.currentTarget.setPointerCapture(event.pointerId);
    } catch {
      // Pointer capture may not be available in every environment.
    }
  }

  function moveAvatar(event) {
    if (!joined || !draggingRef.current || !officeRef.current) {
      return;
    }

    const rect = officeRef.current.getBoundingClientRect();

    if (!rect.width || !rect.height) return;

    // Convert browser coordinates to the shared 1000 x 600 workspace.
    const position = {
      x: clamp(((event.clientX - rect.left) / rect.width) * 1000, 0, 1000),
      y: clamp(((event.clientY - rect.top) / rect.height) * 600, 0, 600),
    };

    localPositionRef.current = position;
    setLocalPosition(position);

    audioSocket.emit("avatar-position-update", {
      roomId: ROOM_ID,
      position,
      displayName: nameRef.current,
    });
  }

  function stopDragging() {
    draggingRef.current = false;
  }

  function positionStyle(position) {
    return {
      left: `${(position.x / 1000) * 100}%`,
      top: `${(position.y / 600) * 100}%`,
    };
  }

  return (
    <main className="app">
      <nav className="navbar">
        <div className="brand">
          <span className="brand-icon">P</span>
          ProxiSpeak
        </div>

        <span className="status">
          <span className="status-dot" />
          {joined ? "Connected workspace" : "Virtual office"}
        </span>
      </nav>

      <section className="hero">
        <div className="hero-copy">
          <span className="eyebrow">A NEW WAY TO CONNECT</span>

          <h1>
            Work together.
            <br />
            <span>Feel closer.</span>
          </h1>

          <p>
            Enter your virtual office, meet your teammates as avatars,
            and experience conversations that change with your position.
          </p>

          {!joined ? (
            <form className="join-form" onSubmit={joinRoom}>
              <label htmlFor="displayName">Your display name</label>

              <input
                id="displayName"
                value={name}
                onChange={(event) => setName(event.target.value)}
                placeholder="Enter your name"
                maxLength={30}
                required
              />

              <button type="submit" disabled={busy}>
                {busy ? "Connecting..." : "Enter workspace"}
                <span>→</span>
              </button>
            </form>
          ) : (
            <div className="workspace-controls">
              <p>
                Welcome, <strong>{nameRef.current}</strong>!
              </p>

              <p className="connection-message">
                Microphone connected. Drag your avatar around the office.
              </p>

              <button
                className="leave-button"
                type="button"
                onClick={leaveRoom}
              >
                Leave workspace
              </button>
            </div>
          )}

          {message && (
            <p className="connection-message" role="status">
              {message}
            </p>
          )}

          <div className="features">
            <span>● Avatar-based rooms</span>
            <span>● Proximity voice</span>
          </div>
        </div>

        <div className="room-preview">
          <div className="room-header">
            <div>
              <span className="room-label">VIRTUAL WORKSPACE</span>
              <h2>Creative Studio</h2>
            </div>

            <span className="live-pill">
              ● {joined ? "LIVE" : "PREVIEW"}
            </span>
          </div>

          <div
            className={`office ${joined ? "office-interactive" : ""}`}
            ref={officeRef}
            onPointerMove={moveAvatar}
            onPointerUp={stopDragging}
            onPointerCancel={stopDragging}
            onLostPointerCapture={stopDragging}
          >
            <div className="room-tag">MEETING AREA</div>

            <div className="desk desk-one">
              <span>DESK01</span>
            </div>

            <div className="desk desk-two">
              <span>DESK02</span>
            </div>

            <div className="plant plant-one">✳</div>
            <div className="plant plant-two">✳</div>

            {joined &&
              remoteIds.map((id, index) => {
                const position = remotePositions[id] || {
                  x: 250 + ((index * 170) % 500),
                  y: 250 + ((index * 80) % 200),
                };

                const remoteName =
                  remoteNames[id] || `Teammate ${index + 1}`;

                return (
                  <div
                    key={id}
                    className="avatar workspace-avatar"
                    style={positionStyle(position)}
                    title={remoteName}
                  >
                    <div className="avatar-head avatar-purple">
                      {remoteName.charAt(0).toUpperCase()}
                    </div>
                    <span>{remoteName}</span>
                  </div>
                );
              })}

            {joined && (
              <div
                className="avatar workspace-avatar local-avatar"
                style={positionStyle(localPosition)}
                onPointerDown={startDragging}
                title={`Drag ${nameRef.current}'s avatar`}
              >
                <div className="avatar-head avatar-orange">
                  {nameRef.current.charAt(0).toUpperCase()}
                </div>
                <span>You ({nameRef.current})</span>
              </div>
            )}

            {!joined && (
              <>
                <div className="avatar avatar-one">
                  <div className="avatar-head avatar-blue">A</div>
                  <span>Alex</span>
                </div>

                <div className="avatar avatar-two">
                  <div className="avatar-head avatar-purple">J</div>
                  <span>Jordan</span>
                </div>

                <div className="avatar avatar-three">
                  <div className="avatar-head avatar-orange">Y</div>
                  <span>You</span>
                </div>

                <div className="voice-indicator">
                  ♫ <span>Speaking</span>
                </div>
              </>
            )}
          </div>

          <div className="room-footer">
            <span>
              <i className="legend-dot blue" />
              Teammates: {remoteIds.length}
            </span>

            <span>
              <i className="legend-dot purple" />
              {joined ? "You are in the room" : "Workspace preview"}
            </span>

            <span className="preview-note">
              {joined ? "Drag your avatar to move" : "Join to get started"}
            </span>
          </div>
        </div>
      </section>

      <footer>
        <span>PROXISPEAK © 2026</span>
        <span>YOUR SPACE. YOUR TEAM. YOUR CONVERSATION.</span>
      </footer>
    </main>
  );
}
