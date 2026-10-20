import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import BrandLogo from "../BrandLogo";
import PreviewNote from "./PreviewNote";
import "./rooms.css";

interface RoomsShellProps {
  /** Eyebrow, heading and supporting text, shown over the photograph. */
  intro: ReactNode;
  headerAction?: ReactNode;
  /** The form card. */
  children: ReactNode;
}

/**
 * Split layout shared by the room-selection and office placeholder screens:
 * a photograph with the headline on one side, the form on the other.
 * The photo is /public/studio.png; without it the panel falls back to solid evergreen.
 */
export default function RoomsShell({ intro, headerAction, children }: RoomsShellProps) {
  return (
    <main className="rooms-page">
      <div className="rooms-photo">
        <Link className="rooms-brand" to="/" aria-label="ProxiSpeak home">
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
