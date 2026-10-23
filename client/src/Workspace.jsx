import { useCallback, useEffect, useRef, useState } from "react";
import "./style.css";

import { audioSocket } from "./services/audio/audioSocket";
import { SpeechDetector } from "./services/audio/speechDetector";
import {
  startAudio,
  stopAudio,
  updateAudioPositions,
  toggleLocalMute,
  getLocalAudioStream,
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

  // Member D: Speaking and Mute states
  const [isMuted, setIsMuted] = useState(false);
  const [isLocalSpeaking, setIsLocalSpeaking] = useState(false);
  const [speakingPeers, setSpeakingPeers] = useState({});
  const [mutedPeers, setMutedPeers] = useState({});

  const officeRef = useRef(null);
  const draggingRef = useRef(false);
  const localPositionRef = useRef(INITIAL_POSITION);
  const nameRef = useRef(initialName);

  useEffect(() => {
    function handleParticipants(ids) {
      if (!Array.isArray(ids)) return;

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
      if (typeof id !== "string" || !id) return;

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

    // Receive positions of participants who were already in the room.
    function handleExistingAvatarPositions(positions = []) {
      if (!Array.isArray(positions)) return;

      setRemotePositions((previous) => {
        const next = { ...previous };

        positions.forEach(({ participantId, position } = {}) => {
          if (
            participantId &&
            position &&
            Number.isFinite(position.x) &&
            Number.isFinite(position.y)
          ) {
            next[participantId] = position;
          }
        });

        return next;
      });

      setRemoteNames((previous) => {
        const next = { ...previous };

        positions.forEach(({ participantId, displayName } = {}) => {
          if (participantId) {
            next[participantId] =
              typeof displayName === "string" && displayName.trim()
                ? displayName.trim().slice(0, 30)
                : next[participantId] || "Teammate";
          }
        });

        return next;
      });

      setRemoteIds((previous) => {
        const next = new Set(previous);

        positions.forEach(({ participantId } = {}) => {
          if (participantId) next.add(participantId);
        });

        return [...next];
      });
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

      // Member D: Clean up speaking and mute state for disconnected user
      setSpeakingPeers((previous) => {
        const next = { ...previous };
        delete next[id];
        return next;
      });

      setMutedPeers((previous) => {
        const next = { ...previous };
        delete next[id];
        return next;
      });
    }

    // Member D: Listen to remote peer speaking event
    function handleUserSpeaking({ participantId, isSpeaking } = {}) {
      if (!participantId) return;
      setSpeakingPeers((previous) => ({
        ...previous,
        [participantId]: isSpeaking,
      }));
    }

    // Member D: Listen to remote peer mute status event
    function handleUserMuteStatus({ participantId, isMuted } = {}) {
      if (!participantId) return;
      setMutedPeers((previous) => ({
        ...previous,
        [participantId]: isMuted,
      }));
    }

    audioSocket.on("audio-room-participants", handleParticipants);
    audioSocket.on("audio-participant-joined", handleParticipantJoined);
    audioSocket.on("avatar-position-update", handlePositionUpdate);
    audioSocket.on("existing-avatar-positions", handleExistingAvatarPositions);
    audioSocket.on("audio-participant-left", handleParticipantLeft);

    // Member D listeners
    audioSocket.on("user-speaking", handleUserSpeaking);
    audioSocket.on("user-mute-status", handleUserMuteStatus);

    return () => {
      audioSocket.off("audio-room-participants", handleParticipants);
      audioSocket.off("audio-participant-joined", handleParticipantJoined);
      audioSocket.off("avatar-position-update", handlePositionUpdate);
      audioSocket.off("existing-avatar-positions", handleExistingAvatarPositions);
      audioSocket.off("audio-participant-left", handleParticipantLeft);

      audioSocket.off("user-speaking", handleUserSpeaking);
      audioSocket.off("user-mute-status", handleUserMuteStatus);
    };
  }, []);

  useEffect(() => {
    localPositionRef.current = localPosition;

    if (joined) {
      updateAudioPositions(localPosition, remotePositions);
    }
  }, [localPosition, remotePositions, joined]);

  // Member D: Detect local user speaking and broadcast to room
  useEffect(() => {
    if (!joined) return;

    const stream = getLocalAudioStream();
    if (!stream) return;

    const detector = new SpeechDetector(stream, (speaking) => {
      setIsLocalSpeaking(speaking);
      audioSocket.emit("speaking", {
        roomId: ROOM_ID,
        isSpeaking: speaking,
      });
    });

    return () => {
      detector.stop();
      setIsLocalSpeaking(false);
    };
  }, [joined]);

  // Member D: Mute / Unmute handler
  function handleToggleMute() {
    const nextMuted = toggleLocalMute();
    setIsMuted(nextMuted);

    audioSocket.emit("toggle-mute", {
      roomId: ROOM_ID,
      isMuted: nextMuted,
    });
  }

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

      // Send the initial position after joining the audio room.
      audioSocket.emit("avatar-position-update", {
        roomId: ROOM_ID,
        position,
        displayName,
      });
    } catch (error) {
      console.error("Could not join ProxiSpeak:", error);

      setMessage(
        error?.name === "NotAllowedError"
          ? "Microphone access was denied. Allow microphone access and try again."
          : `Could not connect: ${error?.message || "Unknown error"}`
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
    setSpeakingPeers({});
    setMutedPeers({});
    setIsLocalSpeaking(false);
    setIsMuted(false);
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

              <div style={{ display: "flex", gap: "10px", marginTop: "12px" }}>
                {/* Member D: Mute / Unmute Button */}
                <button
                  type="button"
                  onClick={handleToggleMute}
                  style={{
                    padding: "8px 16px",
                    borderRadius: "6px",
                    fontWeight: "600",
                    cursor: "pointer",
                    border: "none",
                    background: isMuted ? "#ef4444" : "#22c55e",
                    color: "#ffffff",
                    transition: "all 0.2s ease",
                  }}
                >
                  {isMuted ? "🔇 Unmute Mic" : "🎙️ Mute Mic"}
                </button>

                <button
                  className="leave-button"
                  type="button"
                  onClick={leaveRoom}
                >
                  Leave workspace
                </button>
              </div>
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

            {/* Remote Participants Avatars */}
            {joined &&
              remoteIds.map((id, index) => {
                const position = remotePositions[id] || {
                  x: 250 + ((index * 170) % 500),
                  y: 250 + ((index * 80) % 200),
                };

                const remoteName =
                  remoteNames[id] || `Teammate ${index + 1}`;
                const isPeerSpeaking = Boolean(speakingPeers[id]);
                const isPeerMuted = Boolean(mutedPeers[id]);

                return (
                  <div
                    key={id}
                    className="avatar workspace-avatar"
                    style={positionStyle(position)}
                    title={remoteName}
                  >
                    {/* Member D: Speaking Pulse class */}
                    <div
                      className={`avatar-head avatar-purple ${
                        isPeerSpeaking ? "speaking-pulse" : ""
                      }`}
                    >
                      {remoteName.charAt(0).toUpperCase()}
                    </div>
                    <span>
                      {remoteName} {isPeerMuted ? "🔇" : ""}
                    </span>
                  </div>
                );
              })}

            {/* Local User Avatar */}
            {joined && (
              <div
                className="avatar workspace-avatar local-avatar"
                style={positionStyle(localPosition)}
                onPointerDown={startDragging}
                title={`Drag ${nameRef.current}'s avatar`}
              >
                {/* Member D: Speaking Pulse class for local avatar */}
                <div
                  className={`avatar-head avatar-orange ${
                    isLocalSpeaking ? "speaking-pulse" : ""
                  }`}
                >
                  {nameRef.current.charAt(0).toUpperCase()}
                </div>
                <span>
                  You ({nameRef.current}) {isMuted ? "🔇" : ""}
                </span>
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