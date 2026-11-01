import { useEffect, useRef, useState } from "react";
import { EMOTES } from "../palette";
import type { EmoteKind, PersonSnapshot } from "../types";
import Icon, { type IconName } from "./Icon";
import Portrait from "./Portrait";

export interface Toast {
  id: number;
  icon: IconName | string;
  text: string;
  tone?: "default" | "warn";
}

export function TopBar({
  roomName,
  code,
  people,
  onLeave,
}: {
  roomName: string;
  code: string;
  people: PersonSnapshot[];
  onLeave: () => void;
}) {
  const [copied, setCopied] = useState(false);
  const timer = useRef(0);
  useEffect(() => () => window.clearTimeout(timer.current), []);

  async function copy() {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      window.clearTimeout(timer.current);
      timer.current = window.setTimeout(() => setCopied(false), 1800);
    } catch {
      /* clipboard unavailable: the code is still visible to copy by hand */
    }
  }

  const shown = people.slice(0, 4);
  return (
    <header className="of-top">
      <div className="of-top-left of-card">
        <span className="of-room-mark" aria-hidden="true">
          <i />
          <i />
        </span>
        <div className="of-room-text">
          <strong>{roomName}</strong>
          <button type="button" className="of-code" onClick={copy} aria-label={`Copy invite code ${code}`}>
            <span>{code}</span>
            <Icon name={copied ? "check" : "copy"} size={13} />
            <em>{copied ? "Copied" : "Copy"}</em>
          </button>
        </div>
      </div>

      <div className="of-top-right">
        <span className="of-preview of-card" title="Teammates are simulated until the backend is connected.">
          <Icon name="info" size={14} />
          Preview
        </span>
        <div className="of-stack of-card" aria-label={`${people.length} people in the office`}>
          <span className="of-stack-faces">
            {shown.map((p) => (
              <Portrait key={p.id} look={p.look} size={28} />
            ))}
          </span>
          <span className="of-stack-count">{people.length}</span>
        </div>
        <button type="button" className="of-leave-top of-card" onClick={onLeave}>
          <Icon name="logout" size={16} />
          Leave
        </button>
      </div>
    </header>
  );
}

function DockButton({
  icon,
  label,
  onClick,
  active,
  danger,
  badge,
  shortcut,
  pressed,
}: {
  icon: IconName;
  label: string;
  onClick: () => void;
  active?: boolean;
  danger?: boolean;
  badge?: number;
  shortcut?: string;
  pressed?: boolean;
}) {
  return (
    <button
      type="button"
      className={"of-dock-btn" + (active ? " is-active" : "") + (danger ? " is-danger" : "")}
      onClick={onClick}
      aria-label={label}
      aria-pressed={pressed}
    >
      <Icon name={icon} size={21} />
      {badge ? <b className="of-badge">{badge > 9 ? "9+" : badge}</b> : null}
      <span className="of-tip">
        {label}
        {shortcut ? <kbd>{shortcut}</kbd> : null}
      </span>
    </button>
  );
}

export function Dock({
  muted,
  deafened,
  panel,
  emoteOpen,
  unread,
  onMic,
  onDeafen,
  onEmote,
  onPanel,
  onLook,
  onLeave,
  onPick,
}: {
  muted: boolean;
  deafened: boolean;
  panel: "people" | "chat" | null;
  emoteOpen: boolean;
  unread: number;
  onMic: () => void;
  onDeafen: () => void;
  onEmote: () => void;
  onPanel: (p: "people" | "chat") => void;
  onLook: () => void;
  onLeave: () => void;
  onPick: (k: EmoteKind) => void;
}) {
  return (
    <div className="of-dock-wrap">
      {emoteOpen && (
        <div className="of-emotes of-card" role="menu" aria-label="Reactions">
          {EMOTES.map((m, i) => (
            <button key={m.id} type="button" role="menuitem" className="of-emote" onClick={() => onPick(m.id)} aria-label={m.label}>
              <span>{m.emoji}</span>
              <small>{i + 1}</small>
            </button>
          ))}
        </div>
      )}
      <nav className="of-dock of-card" aria-label="Office controls">
        <DockButton icon={muted ? "micOff" : "mic"} label={muted ? "Unmute" : "Mute"} shortcut="M" onClick={onMic} active={!muted} danger={muted} pressed={!muted} />
        <DockButton icon={deafened ? "headphonesOff" : "headphones"} label={deafened ? "Hear everyone again" : "Stop hearing others"} onClick={onDeafen} danger={deafened} />
        <span className="of-dock-sep" />
        <DockButton icon="smile" label="Reactions" onClick={onEmote} active={emoteOpen} />
        <DockButton icon="chat" label="Nearby chat" onClick={() => onPanel("chat")} active={panel === "chat"} badge={unread} />
        <DockButton icon="users" label="People" onClick={() => onPanel("people")} active={panel === "people"} />
        <span className="of-dock-sep" />
        <DockButton icon="shirt" label="Change look" onClick={onLook} />
        <DockButton icon="logout" label="Leave office" onClick={onLeave} danger />
      </nav>
    </div>
  );
}

export function Toasts({ items }: { items: Toast[] }) {
  return (
    <div className="of-toasts" aria-live="polite">
      {items.map((t) => (
        <div key={t.id} className={"of-toast of-card" + (t.tone === "warn" ? " is-warn" : "")}>
          {t.icon in ICON_SET ? <Icon name={t.icon as IconName} size={16} /> : <span className="of-toast-emoji">{t.icon}</span>}
          <span>{t.text}</span>
        </div>
      ))}
    </div>
  );
}
const ICON_SET: Record<string, true> = { lock: true, info: true, micOff: true, users: true, chat: true };

export function MinimapCard({ canvasRef, zoneName, zonePrivate }: { canvasRef: (el: HTMLCanvasElement | null) => void; zoneName: string; zonePrivate: boolean }) {
  return (
    <aside className="of-map of-card" aria-label="Office map">
      <canvas ref={canvasRef} className="of-map-canvas" />
      <div className="of-map-foot">
        <span className="of-map-here">You’re in</span>
        <strong>
          {zonePrivate && <Icon name="lock" size={12} />}
          {zoneName}
        </strong>
      </div>
    </aside>
  );
}

export function Hint({ onClose }: { onClose: () => void }) {
  return (
    <div className="of-hint of-card" role="note">
      <div className="of-keys" aria-hidden="true">
        <kbd>W</kbd>
        <kbd>A</kbd>
        <kbd>S</kbd>
        <kbd>D</kbd>
      </div>
      <p>
        <strong>Move with the keys or click the floor.</strong>
        <span>Walk up to someone to hear them. Their voice fades as you move away.</span>
      </p>
      <button type="button" className="of-icon-btn" onClick={onClose} aria-label="Dismiss tip">
        <Icon name="x" size={16} />
      </button>
    </div>
  );
}
