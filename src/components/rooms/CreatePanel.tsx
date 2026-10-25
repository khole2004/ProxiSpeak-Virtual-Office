import type { FormEvent } from "react";
import { ROOM_NAME_MAX_LENGTH, type DemoRoom } from "../../services/demoRooms";
import CodeBox from "./CodeBox";

interface CreatePanelProps {
  roomName: string;
  /** What a blank room name becomes, or null while no display name is set. */
  defaultName: string | null;
  error: string | null;
  createdRoom: DemoRoom | null;
  onRoomNameChange: (value: string) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  onEnter: () => void;
  onCreateAnother: () => void;
}

export default function CreatePanel({
  roomName,
  defaultName,
  error,
  createdRoom,
  onRoomNameChange,
  onSubmit,
  onEnter,
  onCreateAnother,
}: CreatePanelProps) {
  if (createdRoom) {
    return (
      <div className="rooms-created">
        <p className="rooms-created-status" role="status">Office created</p>
        <h2 className="rooms-created-name">{createdRoom.name}</h2>
        <CodeBox code={createdRoom.code} />
        <p className="field-hint">Saved in this browser only.</p>
        <button id="enter-office" type="button" className="rooms-button rooms-button--primary" onClick={onEnter}>
          Enter office
        </button>
        <button type="button" className="rooms-link-button" onClick={onCreateAnother}>
          Create another office
        </button>
      </div>
    );
  }

  return (
    <form className="rooms-form" onSubmit={onSubmit} noValidate>
      <div className="field-group">
        <label htmlFor="room-name">Room name (optional)</label>
        <input
          id="room-name"
          type="text"
          placeholder="e.g. Design studio"
          autoComplete="off"
          maxLength={ROOM_NAME_MAX_LENGTH}
          value={roomName}
          onChange={(event) => onRoomNameChange(event.target.value)}
          aria-describedby="room-name-note"
        />
        <p id="room-name-note" className={error ? "field-error" : "field-hint"} role={error ? "alert" : undefined}>
          {error ??
            (defaultName
              ? `Leave blank to use “${defaultName}”.`
              : "Leave blank and we’ll name it after you.")}
        </p>
      </div>
      <button className="rooms-button rooms-button--primary" type="submit">
        Create office
      </button>
    </form>
  );
}
