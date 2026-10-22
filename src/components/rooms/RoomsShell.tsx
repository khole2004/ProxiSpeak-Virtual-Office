import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import BrandLogo from "../BrandLogo";
import PreviewNote from "./PreviewNote";
import "./rooms.css";

interface RoomsShellProps {

  intro: ReactNode;
  headerAction?: ReactNode;

  children: ReactNode;
}

export default function RoomsShell({ intro, headerAction, children }: RoomsShellProps) {
  return (
    <main className="rooms-page">
      <div className="rooms-photo">
        <Link className="rooms-brand" to="/" state={{ skipDoor: true }} aria-label="ProxiSpeak home">
          <BrandLogo tone="dark" />
        </Link>
        <div className="rooms-intro">{intro}</div>
      </div>

      <div className="rooms-panel-area">
        <header className="rooms-header">{headerAction}</header>
        <div className="rooms-body">
          <div className="rooms-stack">
            {children}
            <PreviewNote />
          </div>
        </div>
      </div>
    </main>
  );
}
