import { useEffect, useState } from "react";

/**
 * Optional, local-only microphone level meter. It never records or sends
 * anything: the stream is analysed in the browser to show when *you* are
 * speaking, and is released as soon as you mute.
 */
export function useMicActivity(enabled: boolean, onError: (message: string) => void): boolean {
  const [speaking, setSpeaking] = useState(false);

  useEffect(() => {
    if (!enabled) {
      setSpeaking(false);
      return;
    }
    let stream: MediaStream | null = null;
    let ctx: AudioContext | null = null;
    let timer = 0;
    let cancelled = false;
    let holdUntil = 0;

    (async () => {
      try {
        if (!navigator.mediaDevices?.getUserMedia) throw new Error("unsupported");
        stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true } });
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        ctx = new AudioContext();
        const analyser = ctx.createAnalyser();
        analyser.fftSize = 512;
        ctx.createMediaStreamSource(stream).connect(analyser);
        const buf = new Uint8Array(analyser.fftSize);
        timer = window.setInterval(() => {
          analyser.getByteTimeDomainData(buf);
          let sum = 0;
          for (let i = 0; i < buf.length; i++) {
            const v = (buf[i] - 128) / 128;
            sum += v * v;
          }
          const rms = Math.sqrt(sum / buf.length);
          const now = performance.now();
          if (rms > 0.04) holdUntil = now + 450;
          setSpeaking(now < holdUntil);
        }, 80);
      } catch {
        if (!cancelled) onError("Couldn’t reach your microphone. Check the browser’s permission and try again.");
      }
    })();

    return () => {
      cancelled = true;
      window.clearInterval(timer);
      stream?.getTracks().forEach((t) => t.stop());
      void ctx?.close();
      setSpeaking(false);
    };
    // onError is intentionally not a dependency: it is only called on failure.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled]);

  return speaking;
}
