import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import BrandLogo from "../components/BrandLogo";
import { useDocumentTitle } from "../hooks/useDocumentTitle";
import { OfficeEngine } from "../office/OfficeEngine";
import { EMOTES, randomLook } from "../office/palette";
import { disposePortraits } from "../office/portrait";
import type { AvatarLook, EmoteKind, OfficeEvent, OfficeSnapshot } from "../office/types";
import { Dock, Hint, MinimapCard, Toasts, TopBar, type Toast } from "../office/ui/hud";
import { ChatPanel, CreatorPanel, PeoplePanel, type ChatMessage } from "../office/ui/panels";
import { useMicActivity } from "../office/useMic";
import { readLook, saveLook } from "../services/avatarLook";
import { findRoom, formatRoomCode } from "../services/demoRooms";
import { clearRoomSelection, readSession } from "../services/demoSession";
import "../office/office.css";

const REPLIES: Record<string, string[]> = {
  Meera: ["Hey! Can you hear me okay?", "Come grab a spot, we’re just talking through Friday’s plan.", "Love the outfit 😄"],
  Rohan: ["Welcome in!", "Good timing, we were about to start.", "Try walking away, the voices fade out nicely."],
  Ishita: ["Coffee is on the counter ☕", "Hi! First time in here?", "The café is the best spot for a quick chat."],
  Kabir: ["I’m on mute, typing is easier 😅", "Hey, welcome!", "Sana is at the desks if you need quiet."],
  Aarav: ["I’m in the meeting room, nobody outside can hear us.", "Hi there!", "Come in, it’s private in here."],
  Sana: ["Heads down at the desks. Say hi anytime!", "Hey 👋", "Quiet zone over here, but chat is fine."],
};

function isTyping(t: EventTarget | null): boolean {
  const el = t as HTMLElement | null;
  return !!el && (el.tagName === "INPUT" || el.tagName === "TEXTAREA" || el.isContentEditable);
}

export default function OfficePage() {
  useDocumentTitle("Office | ProxiSpeak");
  const [{ displayName, room }] = useState(() => {
    const session = readSession();
    return { displayName: session.displayName, room: session.roomCode ? findRoom(session.roomCode) : null };
  });

  // Opened directly, or the saved room is gone: go back and choose one.
  if (!room || !displayName) return <Navigate to="/rooms" replace />;
  return <OfficeRoom name={displayName} roomName={room.name} code={formatRoomCode(room.code)} />;
}

function OfficeRoom({ name, roomName, code }: { name: string; roomName: string; code: string }) {
  const navigate = useNavigate();
  const stageRef = useRef<HTMLDivElement>(null);
  const [engine, setEngine] = useState<OfficeEngine | null>(null);
  const [failed, setFailed] = useState(false);
  const [phase, setPhase] = useState<"creator" | "office">("creator");
  const [look, setLook] = useState<AvatarLook>(readLook);
  const [muted, setMuted] = useState(true);
  const [deafened, setDeafened] = useState(false);
  const [snap, setSnap] = useState<OfficeSnapshot | null>(null);
  const [panel, setPanel] = useState<"people" | "chat" | null>(null);
  const [emoteOpen, setEmoteOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [unread, setUnread] = useState(0);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [hint, setHint] = useState(true);
  const [mapEl, setMapEl] = useState<HTMLCanvasElement | null>(null);

  const idRef = useRef(1);
  const lookRef = useRef(look);
  const snapRef = useRef<OfficeSnapshot | null>(null);
  const panelRef = useRef(panel);
  lookRef.current = look;
  snapRef.current = snap;
  panelRef.current = panel;

  const toast = useCallback((icon: string, text: string, tone: Toast["tone"] = "default") => {
    const id = idRef.current++;
    setToasts((t) => [...t.slice(-2), { id, icon, text, tone }]);
    window.setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 3800);
  }, []);

  const eventRef = useRef<(e: OfficeEvent) => void>(() => {});
  eventRef.current = (e) => {
    if (e.type === "zone") toast(e.zonePrivate ? "lock" : "users", e.zonePrivate ? `${e.zoneName} · private. Only people inside can hear you.` : `You’re in ${e.zoneName}`);
    else if (e.type === "near") toast("users", `${e.name} is within earshot`);
    else if (e.type === "wave") toast("👋", `${e.name} waved at you`);
  };

  // ---- engine lifecycle (guarded so React StrictMode's double mount is harmless)
  useEffect(() => {
    let dead = false;
    let created: OfficeEngine | null = null;
    const host = stageRef.current;
    if (!host) return;
    OfficeEngine.create(host, {
      name,
      look: lookRef.current,
      onSnapshot: (s) => setSnap(s),
      onEvent: (e) => eventRef.current(e),
    })
      .then((e) => {
        if (dead) {
          e.dispose();
          return;
        }
        created = e;
        if (import.meta.env.DEV) (window as unknown as { __office?: OfficeEngine }).__office = e;
        setEngine(e);
      })
      .catch(() => !dead && setFailed(true));
    return () => {
      dead = true;
      created?.dispose();
      disposePortraits();
      setEngine(null);
    };
  }, [name]);

  useEffect(() => engine?.setLook(look), [engine, look]);
  useEffect(() => saveLook(look), [look]);
  useEffect(() => engine?.setMuted(muted), [engine, muted]);
  useEffect(() => engine?.setDeafened(deafened), [engine, deafened]);
  useEffect(() => engine?.setMode(phase === "office" ? "play" : "creator"), [engine, phase]);
  useEffect(() => engine?.attachMinimap(mapEl), [engine, mapEl]);

  useEffect(() => {
    if (!engine) return;
    const apply = () => {
      const wide = window.innerWidth >= 900;
      engine.setCreatorShift(phase === "creator" && wide ? 215 : 0, phase === "creator" && !wide ? window.innerHeight * 0.2 : 0);
    };
    apply();
    window.addEventListener("resize", apply);
    return () => window.removeEventListener("resize", apply);
  }, [engine, phase]);

  // ---- microphone (local level meter only)
  const speaking = useMicActivity(phase === "office" && !muted, (msg) => {
    setMuted(true);
    toast("micOff", msg, "warn");
  });
  useEffect(() => engine?.setSelfSpeaking(speaking), [engine, speaking]);

  // ---- actions
  const toggleMic = useCallback(() => setMuted((m) => !m), []);
  const doEmote = useCallback(
    (k: EmoteKind) => {
      engine?.emote(k);
      setEmoteOpen(false);
    },
    [engine]
  );
  const openPanel = useCallback((p: "people" | "chat") => {
    setEmoteOpen(false);
    setPanel((cur) => (cur === p ? null : p));
    if (p === "chat") setUnread(0);
  }, []);

  function leave() {
    clearRoomSelection();
    navigate("/rooms");
  }

  function enter() {
    setPhase("office");
    toast("users", `Welcome to ${roomName}`);
  }

  function sendChat(text: string) {
    const now = Date.now();
    setMessages((m) => [...m, { id: idRef.current++, from: name, look: lookRef.current, text, at: now, self: true }]);
    const audible = (snapRef.current?.people ?? []).filter((p) => !p.isSelf && p.volume > 0);
    if (!audible.length) return;
    const who = audible[Math.floor(Math.random() * audible.length)];
    const lines = REPLIES[who.name] ?? ["Hi!"];
    window.setTimeout(() => {
      setMessages((m) => [...m, { id: idRef.current++, from: who.name, look: who.look, text: lines[Math.floor(Math.random() * lines.length)], at: Date.now(), self: false }]);
      if (panelRef.current !== "chat") setUnread((u) => u + 1);
    }, 1300 + Math.random() * 1800);
  }

  // ---- keyboard shortcuts and tip dismissal
  useEffect(() => {
    if (phase !== "office") return;
    const onKey = (e: KeyboardEvent) => {
      if (isTyping(e.target) || e.ctrlKey || e.metaKey || e.altKey) return;
      const k = e.key.toLowerCase();
      if (k === "m") toggleMic();
      else if (k === "escape") {
        setPanel(null);
        setEmoteOpen(false);
      } else if (/^[1-6]$/.test(k)) doEmote(EMOTES[Number(k) - 1].id);
      if (["w", "a", "s", "d", "arrowup", "arrowdown", "arrowleft", "arrowright"].includes(k)) setHint(false);
    };
    window.addEventListener("keydown", onKey);
    const t = window.setTimeout(() => setHint(false), 18000);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.clearTimeout(t);
    };
  }, [phase, toggleMic, doEmote]);

  const people = useMemo(() => snap?.people ?? [], [snap]);
  const nearCount = people.filter((p) => !p.isSelf && p.volume > 0).length;

  return (
    <main className="office-page" data-phase={phase}>
      <div
        className="office-stage"
        ref={stageRef}
        onPointerDown={() => {
          setHint(false);
          setEmoteOpen(false);
        }}
      />

      {!engine && !failed && (
        <div className="of-loading" role="status">
          <span className="of-spinner" aria-hidden="true" />
          Opening {roomName}…
        </div>
      )}
      {failed && (
        <div className="of-loading of-loading--error" role="alert">
          <p>Your browser couldn’t start the 3D office. Turn on hardware acceleration and try again.</p>
          <button type="button" className="of-btn of-btn--ghost" onClick={leave}>
            Back to rooms
          </button>
        </div>
      )}

      {engine && phase === "creator" && (
        <div className="of-hud">
          <div className="of-brand">
            <BrandLogo tone="dark" />
          </div>
          <CreatorPanel
            name={name}
            roomName={roomName}
            look={look}
            micOn={!muted}
            onChange={setLook}
            onShuffle={() => setLook(randomLook())}
            onMic={(on) => setMuted(!on)}
            onEnter={enter}
          />
        </div>
      )}

      {engine && phase === "office" && (
        <div className="of-hud">
          <TopBar roomName={roomName} code={code} people={people} onLeave={leave} />
          <Toasts items={toasts} />
          <MinimapCard canvasRef={setMapEl} zoneName={snap?.zoneName ?? "The Commons"} zonePrivate={snap?.zonePrivate ?? false} />
          {hint && <Hint onClose={() => setHint(false)} />}
          {panel === "people" && <PeoplePanel people={people} onClose={() => setPanel(null)} />}
          {panel === "chat" && <ChatPanel messages={messages} nearCount={nearCount} onSend={sendChat} onClose={() => setPanel(null)} />}
          <Dock
            muted={muted}
            deafened={deafened}
            panel={panel}
            emoteOpen={emoteOpen}
            unread={unread}
            onMic={toggleMic}
            onDeafen={() => {
              setDeafened((d) => !d);
              toast(deafened ? "users" : "micOff", deafened ? "You can hear people again" : "You can’t hear anyone right now");
            }}
            onEmote={() => {
              setPanel(null);
              setEmoteOpen((o) => !o);
            }}
            onPanel={openPanel}
            onLook={() => {
              setPanel(null);
              setEmoteOpen(false);
              setPhase("creator");
            }}
            onLeave={leave}
            onPick={doEmote}
          />
        </div>
      )}
    </main>
  );
}
