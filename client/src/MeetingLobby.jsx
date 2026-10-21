
import { useEffect, useRef, useState } from "react";
import "./MeetingLobby.css";

export default function MeetingLobby({ displayName, onJoin }) {
  const videoRef = useRef(null);
  const micStreamRef = useRef(null);
  const cameraStreamRef = useRef(null);
  const audioContextRef = useRef(null);
  const animationRef = useRef(null);

  const [micStatus, setMicStatus] = useState("not-checked");
  const [cameraStatus, setCameraStatus] = useState("not-checked");
  const [micLevel, setMicLevel] = useState(0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    return () => {
      stopPreview();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function stopStream(stream) {
    stream?.getTracks().forEach((track) => track.stop());
  }

  function stopMicrophoneTest() {
    if (animationRef.current !== null) {
      cancelAnimationFrame(animationRef.current);
      animationRef.current = null;
    }

    if (audioContextRef.current) {
      const context = audioContextRef.current;
      audioContextRef.current = null;
      context.close().catch(() => {});
    }

    setMicLevel(0);
  }

  function stopPreview() {
    stopMicrophoneTest();

    stopStream(micStreamRef.current);
    stopStream(cameraStreamRef.current);

    micStreamRef.current = null;
    cameraStreamRef.current = null;

    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
  }

  async function enableMicrophone() {
    setError("");
    setBusy(true);

    try {
      if (!navigator.mediaDevices?.getUserMedia) {
        throw new Error(
          "Microphone access requires localhost or HTTPS and a supported browser."
        );
      }

      stopStream(micStreamRef.current);
      micStreamRef.current = null;
      stopMicrophoneTest();

      const stream = await navigator.mediaDevices.getUserMedia({
        audio: true,
      });

      micStreamRef.current = stream;
      setMicStatus("allowed");

      startMicrophoneTest(stream);
    } catch (err) {
      setMicStatus("denied");
      setError(
        err.name === "NotAllowedError" || err.name === "PermissionDeniedError"
          ? "Microphone permission denied. Allow access in your browser settings."
          : err.name === "NotFoundError"
            ? "No microphone found. Connect a microphone and try again."
            : err.message || "Could not access the microphone."
      );
    } finally {
      setBusy(false);
    }
  }

  function disableMicrophone() {
    stopStream(micStreamRef.current);
    micStreamRef.current = null;

    stopMicrophoneTest();

    setMicStatus("off");
    setError("");
  }

  async function enableCamera() {
    setError("");
    setBusy(true);

    try {
      if (!navigator.mediaDevices?.getUserMedia) {
        throw new Error(
          "Camera access requires localhost or HTTPS and a supported browser."
        );
      }

      stopStream(cameraStreamRef.current);
      cameraStreamRef.current = null;

      const stream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: false,
      });

      cameraStreamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play().catch(() => {});
      }

      setCameraStatus("allowed");
    } catch (err) {
      setCameraStatus("denied");
      setError(
        err.name === "NotAllowedError" || err.name === "PermissionDeniedError"
          ? "Camera permission denied. Allow access in your browser settings."
          : err.name === "NotFoundError"
            ? "No camera found. You can still join without a camera."
            : err.message || "Could not access the camera."
      );
    } finally {
      setBusy(false);
    }
  }

  function disableCamera() {
    stopStream(cameraStreamRef.current);
    cameraStreamRef.current = null;

    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }

    setCameraStatus("off");
    setError("");
  }

  async function startMicrophoneTest(stream) {
    try {
      const AudioContextClass =
        window.AudioContext || window.webkitAudioContext;

      if (!AudioContextClass) return;

      const audioContext = new AudioContextClass();
      audioContextRef.current = audioContext;

      await audioContext.resume();

      if (
        audioContextRef.current !== audioContext ||
        micStreamRef.current !== stream ||
        !stream.active
      ) {
        audioContext.close().catch(() => {});
        return;
      }

      const source = audioContext.createMediaStreamSource(stream);
      const analyser = audioContext.createAnalyser();

      analyser.fftSize = 256;
      source.connect(analyser);

      const samples = new Uint8Array(analyser.fftSize);

      function measure() {
        if (
          audioContextRef.current !== audioContext ||
          micStreamRef.current !== stream ||
          !stream.active
        ) {
          return;
        }

        analyser.getByteTimeDomainData(samples);

        let sum = 0;

        for (const sample of samples) {
          const normalized = (sample - 128) / 128;
          sum += normalized * normalized;
        }

        const rms = Math.sqrt(sum / samples.length);
        setMicLevel(Math.min(100, Math.round(rms * 350)));

        animationRef.current = requestAnimationFrame(measure);
      }

      measure();
    } catch {
      // The microphone can still work if level monitoring is unavailable.
    }
  }

  function handleJoin() {
    // The existing Workspace can initialize its own microphone.
    stopPreview();
    onJoin();
  }

  function statusLabel(status) {
    if (status === "allowed") return "On · Permission granted";
    if (status === "off") return "Off";
    if (status === "denied") return "Permission unavailable";
    return "Not checked yet";
  }

  return (
    <main className="meeting-lobby">
      <div className="lobby-glow lobby-glow-one" />
      <div className="lobby-glow lobby-glow-two" />

      <header className="lobby-header">
        <div className="lobby-brand">
          <span className="lobby-brand-icon">P</span>
          <span>ProxiSpeak</span>
        </div>

        <span className="lobby-header-label">MEETING LOBBY</span>
      </header>

      <section className="lobby-content">
        <div className="lobby-intro">
          <span className="lobby-eyebrow">A NEW WAY TO CONNECT</span>

          <h1>Ready to meet?</h1>

          <p>
            Check your devices before entering your virtual office.
            Your teammates are waiting.
          </p>

          <div className="lobby-user">
            <span className="lobby-user-avatar">
              {(displayName || "U").charAt(0).toUpperCase()}
            </span>

            <div>
              <strong>Welcome, {displayName || "Teammate"}!</strong>
              <span>Set up your meeting</span>
            </div>
          </div>
        </div>

        <div className="lobby-panel">
          <div className="lobby-preview">
            <video
              ref={videoRef}
              autoPlay
              muted
              playsInline
              aria-label="Your camera preview"
            />

            {cameraStatus !== "allowed" && (
              <div className="lobby-camera-placeholder">
                <div className="lobby-camera-icon">◉</div>
                <strong>Camera is off</strong>
                <span>Enable your camera for a live preview</span>
              </div>
            )}

            <span className="lobby-preview-label">
              <span className="lobby-live-dot" />
              YOUR PREVIEW
            </span>
          </div>

          <div className="lobby-device-list">
            {/* Microphone controls */}
            <div className="lobby-device">
              <div className="lobby-device-icon">♩</div>

              <div className="lobby-device-info">
                <strong>Microphone</strong>
                <span>{statusLabel(micStatus)}</span>

                {micStatus === "allowed" && (
                  <div
                    className="lobby-meter"
                    role="progressbar"
                    aria-label="Microphone input level"
                    aria-valuemin={0}
                    aria-valuemax={100}
                    aria-valuenow={micLevel}
                  >
                    <div
                      className="lobby-meter-fill"
                      style={{ width: `${micLevel}%` }}
                    />
                  </div>
                )}
              </div>

              <button
                type="button"
                className="lobby-device-button"
                onClick={
                  micStatus === "allowed"
                    ? disableMicrophone
                    : enableMicrophone
                }
                disabled={busy}
                aria-pressed={micStatus === "allowed"}
              >
                {micStatus === "allowed" ? "Turn OFF" : "Turn ON"}
              </button>
            </div>

            {/* Camera controls */}
            <div className="lobby-device">
              <div className="lobby-device-icon">▣</div>

              <div className="lobby-device-info">
                <strong>Camera</strong>
                <span>{statusLabel(cameraStatus)}</span>
              </div>

              <button
                type="button"
                className="lobby-device-button"
                onClick={
                  cameraStatus === "allowed"
                    ? disableCamera
                    : enableCamera
                }
                disabled={busy}
                aria-pressed={cameraStatus === "allowed"}
              >
                {cameraStatus === "allowed" ? "Turn OFF" : "Turn ON"}
              </button>
            </div>
          </div>

          {error && (
            <p className="lobby-error" role="alert">
              {error}
            </p>
          )}

          <button
            type="button"
            className="lobby-join-button"
            onClick={handleJoin}
            disabled={busy}
          >
            Join Meeting <span aria-hidden="true">→</span>
          </button>

          <p className="lobby-privacy">
            You control your camera and microphone permissions.
            You can join without enabling your camera.
          </p>
        </div>
      </section>
    </main>
  );
}
