import { useEffect, useRef, useState, type FormEvent, type KeyboardEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import CreatePanel from "../components/rooms/CreatePanel";
import JoinPanel from "../components/rooms/JoinPanel";
import RoomsShell from "../components/rooms/RoomsShell";
import { useDocumentTitle } from "../hooks/useDocumentTitle";
import {
  SAMPLE_ROOM,
  createRoom,
  defaultRoomName,
  findRoom,
  formatRoomCode,
  isRoomCodeFormat,
  normalizeRoomCode,
  type DemoRoom,
} from "../services/demoRooms";
import { DISPLAY_NAME_MAX_LENGTH, readSession, saveSession, validateDisplayName } from "../services/demoSession";

type Mode = "create" | "join";

const TABS: { mode: Mode; label: string }[] = [
  { mode: "create", label: "Create office" },
  { mode: "join", label: "Join office" },
];

export default function RoomsPage() {
  useDocumentTitle("Your workspace | ProxiSpeak");
  const navigate = useNavigate();

  const [displayName, setDisplayName] = useState(() => readSession().displayName);
  const [nameError, setNameError] = useState<string | null>(null);
  const [mode, setMode] = useState<Mode>("create");
  const [roomName, setRoomName] = useState("");
  const [createdRoom, setCreatedRoom] = useState<DemoRoom | null>(null);
  const [createError, setCreateError] = useState<string | null>(null);
  const [joinCode, setJoinCode] = useState("");
  const [joinError, setJoinError] = useState<string | null>(null);

  const nameInputRef = useRef<HTMLInputElement>(null);
  const pendingFocus = useRef<string | null>(null);

  // Moves focus to an element that only exists after the next render.
  useEffect(() => {
    if (pendingFocus.current) {
      document.getElementById(pendingFocus.current)?.focus();
      pendingFocus.current = null;
    }
  });

  const joinMatch = isRoomCodeFormat(normalizeRoomCode(joinCode)) ? findRoom(joinCode) : null;

  /** Returns the trimmed display name, or flags the field and returns null. */
  function requireName(): string | null {
    const result = validateDisplayName(displayName);
    if (!result.valid) {
      setNameError(result.message);
      nameInputRef.current?.focus();
      return null;
    }
    setNameError(null);
    setDisplayName(result.value);
    return result.value;
  }

  function handleNameChange(value: string) {
    setDisplayName(value);
    if (nameError && validateDisplayName(value).valid) setNameError(null);
  }

  function handleTabKeys(event: KeyboardEvent<HTMLDivElement>) {
    const index = TABS.findIndex((tab) => tab.mode === mode);
    let next = index;
    if (event.key === "ArrowRight") next = (index + 1) % TABS.length;
    else if (event.key === "ArrowLeft") next = (index + TABS.length - 1) % TABS.length;
    else if (event.key === "Home") next = 0;
    else if (event.key === "End") next = TABS.length - 1;
    else return;
    event.preventDefault();
    setMode(TABS[next].mode);
    document.getElementById(`tab-${TABS[next].mode}`)?.focus();
  }

  function handleCreate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (createdRoom) return; // never create twice from one confirmation
    const name = requireName();
    if (!name) return;

    try {
      const room = createRoom({ displayName: name, roomName });
      saveSession({ displayName: name });
      pendingFocus.current = "enter-office";
      setCreateError(null);
      setCreatedRoom(room);
    } catch {
      setCreateError("Couldn’t generate a free room code. Try again.");
    }
  }

  function enterOffice(room: DemoRoom) {
    const name = requireName();
    if (!name) return;
    saveSession({ displayName: name, roomCode: room.code });
    navigate("/office");
  }

  function handleJoin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const name = requireName();
    if (!name) return;

    const code = normalizeRoomCode(joinCode);
    if (!isRoomCodeFormat(code)) {
      setJoinError(`Enter the 6-character code, like ${formatRoomCode("ABC123")}.`);
      return;
    }
    const room = findRoom(code);
    if (!room) {
      setJoinError(
        `No office with code ${formatRoomCode(code)} in this browser. Preview rooms are saved locally, so codes from other computers won’t work yet.`
      );
      return;
    }
    enterOffice(room);
  }

  return (
    <RoomsShell
      intro={
        <>
          <p className="rooms-eyebrow">YOUR WORKSPACE</p>
          <h1>Choose a room to work in.</h1>
          <p className="rooms-lede">Create a room for your team, or join one with its code.</p>
        </>
      }
      headerAction={
        <Link className="rooms-link" to="/" state={{ skipDoor: true }}>
          Back to sign in
        </Link>
      }
    >
        <div className="rooms-card">
          <div className="field-group">
            <label htmlFor="display-name">Display name</label>
            <input
              id="display-name"
              ref={nameInputRef}
              type="text"
              placeholder="Your name"
              autoComplete="nickname"
              maxLength={DISPLAY_NAME_MAX_LENGTH}
              value={displayName}
              onChange={(event) => handleNameChange(event.target.value)}
              onBlur={() => setDisplayName((current) => current.trim())}
              aria-invalid={nameError ? true : undefined}
              aria-describedby="display-name-note"
            />
            <p
              id="display-name-note"
              className={nameError ? "field-error" : "field-hint"}
              role={nameError ? "alert" : undefined}
            >
              {nameError ?? `Shown to others in the room. Up to ${DISPLAY_NAME_MAX_LENGTH} characters.`}
            </p>
          </div>

          <hr className="rooms-divider" />

          <div className="rooms-tabs" role="tablist" aria-label="Room options" onKeyDown={handleTabKeys}>
            {TABS.map((tab) => (
              <button
                key={tab.mode}
                id={`tab-${tab.mode}`}
                type="button"
                role="tab"
                aria-selected={mode === tab.mode}
                aria-controls={`panel-${tab.mode}`}
                tabIndex={mode === tab.mode ? 0 : -1}
                className="rooms-tab"
                onClick={() => setMode(tab.mode)}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <div id={`panel-${mode}`} role="tabpanel" aria-labelledby={`tab-${mode}`}>
            {mode === "create" ? (
              <CreatePanel
                roomName={roomName}
                defaultName={displayName.trim() ? defaultRoomName(displayName) : null}
                error={createError}
                createdRoom={createdRoom}
                onRoomNameChange={(value) => {
                  setRoomName(value);
                  setCreateError(null);
                }}
                onSubmit={handleCreate}
                onEnter={() => createdRoom && enterOffice(createdRoom)}
                onCreateAnother={() => {
                  setCreatedRoom(null);
                  setRoomName("");
                  pendingFocus.current = "room-name";
                }}
              />
            ) : (
              <JoinPanel
                code={joinCode}
                error={joinError}
                match={joinMatch}
                onCodeChange={(value) => {
                  setJoinCode(formatRoomCode(value));
                  setJoinError(null);
                }}
                onUseSample={() => {
                  setJoinCode(formatRoomCode(SAMPLE_ROOM.code));
                  setJoinError(null);
                }}
                onSubmit={handleJoin}
              />
            )}
          </div>
        </div>
    </RoomsShell>
  );
}
