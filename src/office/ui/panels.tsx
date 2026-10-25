import { useEffect, useRef, useState, type FormEvent } from "react";
import { ACCESSORIES, BOTTOM_COLORS, HAIR_COLORS, HAIR_STYLES, SKIN_TONES, TOP_COLORS } from "../palette";
import type { Accessory, AvatarLook, HairStyle, PersonSnapshot } from "../types";
import Icon from "./Icon";
import Portrait from "./Portrait";

export interface ChatMessage {
  id: number;
  from: string;
  look: AvatarLook;
  text: string;
  at: number;
  self: boolean;
}

function Drawer({ title, sub, onClose, children }: { title: string; sub?: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <aside className="of-drawer of-card" aria-label={title}>
      <header className="of-drawer-head">
        <div>
          <h2>{title}</h2>
          {sub && <p>{sub}</p>}
        </div>
        <button type="button" className="of-icon-btn" onClick={onClose} aria-label={`Close ${title.toLowerCase()}`}>
          <Icon name="x" size={18} />
        </button>
      </header>
      {children}
    </aside>
  );
}

function VolumeBars({ volume }: { volume: number }) {
  const level = Math.round(volume * 3);
  return (
    <span className="of-vol" data-level={level} aria-label={volume > 0 ? `Volume ${Math.round(volume * 100)} percent` : "Out of range"}>
      <i />
      <i />
      <i />
    </span>
  );
}

function PersonRow({ p }: { p: PersonSnapshot }) {
  const far = !p.isSelf && p.volume <= 0;
  return (
    <li className={"of-person" + (far ? " is-far" : "")}>
      <Portrait look={p.look} size={42} speaking={p.speaking} />
      <div className="of-person-text">
        <strong>
          {p.name}
          {p.isSelf && <em> (you)</em>}
        </strong>
        <span>
          {p.zoneName}
          {!p.isSelf && ` · ${p.distance.toFixed(1)} m`}
        </span>
      </div>
      <div className="of-person-state">
        {p.muted ? (
          <span className="of-muted" title="Muted">
            <Icon name="micOff" size={15} />
          </span>
        ) : p.speaking ? (
          <span className="of-live">Speaking</span>
        ) : null}
        {!p.isSelf && <VolumeBars volume={p.volume} />}
      </div>
    </li>
  );
}

export function PeoplePanel({ people, onClose }: { people: PersonSnapshot[]; onClose: () => void }) {
  const me = people.filter((p) => p.isSelf);
  const near = people.filter((p) => !p.isSelf && p.volume > 0);
  const away = people.filter((p) => !p.isSelf && p.volume <= 0);
  return (
    <Drawer title="People" sub={`${people.length} in the office`} onClose={onClose}>
      <div className="of-drawer-body">
        <ul className="of-people">{me.map((p) => <PersonRow key={p.id} p={p} />)}</ul>
        <h3 className="of-section">Within earshot · {near.length}</h3>
        {near.length ? (
          <ul className="of-people">{near.map((p) => <PersonRow key={p.id} p={p} />)}</ul>
        ) : (
          <p className="of-empty">No one is close enough to hear. Walk towards someone.</p>
        )}
        <h3 className="of-section">Elsewhere · {away.length}</h3>
        {away.length ? <ul className="of-people">{away.map((p) => <PersonRow key={p.id} p={p} />)}</ul> : <p className="of-empty">Everyone is nearby.</p>}
      </div>
    </Drawer>
  );
}

export function ChatPanel({
  messages,
  nearCount,
  onSend,
  onClose,
}: {
  messages: ChatMessage[];
  nearCount: number;
  onSend: (text: string) => void;
  onClose: () => void;
}) {
  const [text, setText] = useState("");
  const listRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const el = listRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages.length]);
  useEffect(() => inputRef.current?.focus({ preventScroll: true }), []);

  function submit(e: FormEvent) {
    e.preventDefault();
    const t = text.trim();
    if (!t) return;
    onSend(t);
    setText("");
  }

  return (
    <Drawer
      title="Nearby chat"
      sub={nearCount ? `${nearCount} ${nearCount === 1 ? "person" : "people"} can read this` : "No one is close enough to read this"}
      onClose={onClose}
    >
      <div className="of-chat-list" ref={listRef}>
        {messages.length === 0 ? (
          <p className="of-empty of-empty--chat">Messages only reach people standing within earshot. Say hello.</p>
        ) : (
          messages.map((m) => (
            <div key={m.id} className={"of-msg" + (m.self ? " is-self" : "")}>
              <Portrait look={m.look} size={30} />
              <div>
                <header>
                  <strong>{m.self ? "You" : m.from}</strong>
                  <time>{new Date(m.at).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}</time>
                </header>
                <p>{m.text}</p>
              </div>
            </div>
          ))
        )}
      </div>
      <form className="of-chat-form" onSubmit={submit}>
        <input ref={inputRef} value={text} onChange={(e) => setText(e.target.value)} placeholder="Message people nearby" maxLength={240} aria-label="Message people nearby" />
        <button type="submit" className="of-send" disabled={!text.trim()} aria-label="Send message">
          <Icon name="send" size={17} />
        </button>
      </form>
    </Drawer>
  );
}

function Swatches({ label, value, options, onPick }: { label: string; value: string; options: string[]; onPick: (v: string) => void }) {
  return (
    <fieldset className="of-field">
      <legend>{label}</legend>
      <div className="of-swatches" role="radiogroup" aria-label={label}>
        {options.map((c) => (
          <button
            key={c}
            type="button"
            role="radio"
            aria-checked={c === value}
            aria-label={c}
            className={"of-swatch" + (c === value ? " is-on" : "")}
            style={{ background: c }}
            onClick={() => onPick(c)}
          />
        ))}
      </div>
    </fieldset>
  );
}

function Chips<T extends string>({ label, value, options, onPick }: { label: string; value: T; options: { id: T; label: string }[]; onPick: (v: T) => void }) {
  return (
    <fieldset className="of-field">
      <legend>{label}</legend>
      <div className="of-chips" role="radiogroup" aria-label={label}>
        {options.map((o) => (
          <button key={o.id} type="button" role="radio" aria-checked={o.id === value} className={"of-chip" + (o.id === value ? " is-on" : "")} onClick={() => onPick(o.id)}>
            {o.label}
          </button>
        ))}
      </div>
    </fieldset>
  );
}

export function CreatorPanel({
  name,
  roomName,
  look,
  micOn,
  onChange,
  onShuffle,
  onMic,
  onEnter,
}: {
  name: string;
  roomName: string;
  look: AvatarLook;
  micOn: boolean;
  onChange: (l: AvatarLook) => void;
  onShuffle: () => void;
  onMic: (v: boolean) => void;
  onEnter: () => void;
}) {
  const set = <K extends keyof AvatarLook>(k: K, v: AvatarLook[K]) => onChange({ ...look, [k]: v });
  return (
    <aside className="of-creator of-card" aria-label="Choose your look">
      <header className="of-creator-head">
        <p>You’re joining {roomName}</p>
        <h1>Hi {name}, choose your look</h1>
        <span>Drag the character to turn around.</span>
      </header>

      <div className="of-creator-body">
        <Swatches label="Skin" value={look.skin} options={SKIN_TONES} onPick={(v) => set("skin", v)} />
        <Chips<HairStyle> label="Hair" value={look.hairStyle} options={HAIR_STYLES} onPick={(v) => set("hairStyle", v)} />
        {look.hairStyle !== "bald" && <Swatches label="Hair colour" value={look.hairColor} options={HAIR_COLORS} onPick={(v) => set("hairColor", v)} />}
        <Swatches label="Top" value={look.top} options={TOP_COLORS} onPick={(v) => set("top", v)} />
        <Swatches label="Trousers" value={look.bottom} options={BOTTOM_COLORS} onPick={(v) => set("bottom", v)} />
        <Chips<Accessory> label="Accessory" value={look.accessory} options={ACCESSORIES} onPick={(v) => set("accessory", v)} />
      </div>

      <footer className="of-creator-foot">
        <button type="button" className="of-btn of-btn--ghost" onClick={onShuffle}>
          <Icon name="shuffle" size={17} />
          Surprise me
        </button>
        <label className="of-switch">
          <input type="checkbox" checked={micOn} onChange={(e) => onMic(e.target.checked)} />
          <span className="of-switch-track" aria-hidden="true" />
          <span>Join with my microphone on</span>
        </label>
        <button type="button" className="of-btn of-btn--primary" onClick={onEnter}>
          Enter the office
        </button>
      </footer>
    </aside>
  );
}
