import { memo, useMemo } from "react";
import { getPortrait } from "../portrait";
import type { AvatarLook } from "../types";

/** A 3D-rendered head-and-shoulders portrait of an avatar. */
function PortraitBase({ look, size = 40, speaking = false }: { look: AvatarLook; size?: number; speaking?: boolean }) {
  const key = JSON.stringify(look);
  const src = useMemo(() => getPortrait(look), [key]); // eslint-disable-line react-hooks/exhaustive-deps
  return (
    <span className={"of-portrait" + (speaking ? " is-speaking" : "")} style={{ width: size, height: size }}>
      {src ? <img src={src} alt="" width={size} height={size} draggable={false} /> : <i style={{ background: look.top }} />}
    </span>
  );
}

export default memo(PortraitBase);
