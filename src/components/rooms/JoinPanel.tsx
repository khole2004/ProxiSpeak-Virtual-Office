import type { FormEvent } from "react";
import { ROOM_CODE_LENGTH, type DemoRoom } from "../../services/demoRooms";

interface JoinPanelProps {
  code: string;
  error: string | null;
  /** The known room that the current code points to, if any. */
  match: DemoRoom | null;
  onCodeChange: (value: string) => void;
  onUseSample: () => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
}

export default function JoinPanel({ code, error, match, onCodeChange, onUseSample, onSubmit }: JoinPanelProps) {
  return (
    <form className="rooms-form" onSubmit={onSubmit} noValidate>
      <div className="field-group">
        <label htmlFor="room-code">Room code</label>
        <input
          id="room-code"
          className="code-input"
          type="text"
          placeholder="ABC-123"
          autoComplete="off"
          autoCapitalize="characters"
          spellCheck={false}
          maxLength={ROOM_CODE_LENGTH + 1}
          value={code}
          onChange={(event) => onCodeChange(event.target.value)}
          aria-invalid={error ? true : undefined}
          aria-describedby="room-code-note"
        />
        <div id="room-code-note" aria-live="polite">
          {error ? (
            <p className="field-error" role="alert">{error}</p>
          ) : match ? (
            <p className="field-found">Found “{match.name}”</p>
          ) : (
            <p className="field-hint">
              Codes have {ROOM_CODE_LENGTH} letters or numbers.{" "}
              <button type="button" className="rooms-link-button rooms-link-button--inline" onClick={onUseSample}>
                Use the sample code
              </button>
            </p>
          )}
        </div>
      </div>
      <button className="rooms-button rooms-button--primary" type="submit">
        Join office
      </button>
    </form>
  );
}
