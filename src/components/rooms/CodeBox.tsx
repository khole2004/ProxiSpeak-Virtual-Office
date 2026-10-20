import { useEffect, useRef, useState } from "react";
import { formatRoomCode } from "../../services/demoRooms";

type CopyState = "idle" | "copied" | "failed";

/** The room code in a quiet box with a copy button. */
export default function CodeBox({ code }: { code: string }) {
  const [copyState, setCopyState] = useState<CopyState>("idle");
  const timer = useRef<number | undefined>(undefined);

  useEffect(() => () => window.clearTimeout(timer.current), []);

  async function copy() {
    try {
      await navigator.clipboard.writeText(formatRoomCode(code));
      setCopyState("copied");
    } catch {
      setCopyState("failed");
    }
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => setCopyState("idle"), 2400);
  }

  return (
    <>
      <div className="code-box">
        <span className="code-box-value" aria-hidden="true">{formatRoomCode(code)}</span>
        <span className="rooms-sr-only">Room code {code.split("").join(" ")}</span>
        <button type="button" className="rooms-button rooms-button--secondary" onClick={copy}>
          {copyState === "copied" ? "Copied" : "Copy code"}
        </button>
      </div>
      <p className="rooms-sr-only" aria-live="polite">
        {copyState === "copied" && "Code copied."}
        {copyState === "failed" && "Couldn’t copy. Select the code and copy it by hand."}
      </p>
    </>
  );
}
