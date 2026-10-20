import { useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import CodeBox from "../components/rooms/CodeBox";
import RoomsShell from "../components/rooms/RoomsShell";
import { useDocumentTitle } from "../hooks/useDocumentTitle";
import { findRoom } from "../services/demoRooms";
import { clearRoomSelection, readSession } from "../services/demoSession";


export default function OfficePage() {
  useDocumentTitle("Office | ProxiSpeak");
  const navigate = useNavigate();
  const [{ displayName, room }] = useState(() => {
    const session = readSession();
    return {
      displayName: session.displayName,
      room: session.roomCode ? findRoom(session.roomCode) : null,
    };
  });

 
  if (!room || !displayName) return <Navigate to="/rooms" replace />;

  function leave() {
    clearRoomSelection();
    navigate("/rooms");
  }

  return (
    <RoomsShell
      intro={
        <>
          <p className="rooms-eyebrow">YOUR WORKSPACE</p>
          <h1>{room.name}</h1>
          <p className="rooms-lede">You’re in as {displayName}. Your name and room are kept for this browser tab.</p>
        </>
      }
    >
      <div className="rooms-card">
        <div className="rooms-created">
          <h2 className="rooms-created-name">The office map is next</h2>
          <p className="rooms-body-text">
            This page holds your place. The interactive map comes next: you’ll move around the office
            and hear people fade with distance.
          </p>
          <CodeBox code={room.code} />
          <button type="button" className="rooms-button rooms-button--secondary rooms-button--wide" onClick={leave}>
            Leave office
          </button>
        </div>
      </div>
    </RoomsShell>
  );
}
