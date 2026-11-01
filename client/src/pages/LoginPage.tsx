import { useEffect, useRef, useState, type FormEvent } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import BrandLogo from "../components/BrandLogo";
import OfficeDoor from "../components/OfficeDoor";
import { useDocumentTitle } from "../hooks/useDocumentTitle";
import "./login.css";

/**
 * idle     door closed, waiting for a click
 * opening  door swings in, light spills out
 * entering camera pushes through the doorway
 * open     sign-in form is live
 */
type Phase = "idle" | "opening" | "entering" | "open";

/** Milliseconds from the click to each phase. Keep in step with login.css. */
const ENTER_AT = 1000;
const OPEN_AT = 1800;

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function LoginPage() {
  useDocumentTitle("Sign in | ProxiSpeak");
  const navigate = useNavigate();
  const location = useLocation();
  const skipDoor = Boolean((location.state as { skipDoor?: boolean } | null)?.skipDoor);

  const [phase, setPhase] = useState<Phase>(skipDoor ? "open" : "idle");
  const timers = useRef<number[]>([]);
  const pageRef = useRef<HTMLElement>(null);
  const layoutRef = useRef<HTMLDivElement>(null);
  const emailInputRef = useRef<HTMLInputElement>(null);
  const passwordInputRef = useRef<HTMLInputElement>(null);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [emailError, setEmailError] = useState<string | null>(null);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [note, setNote] = useState<string | null>(null);

  // The form is unreachable (mouse, keyboard, screen reader) until the door has opened.
  useEffect(() => {
    const layout = layoutRef.current as (HTMLDivElement & { inert: boolean }) | null;
    if (layout) layout.inert = phase !== "open";
    if (phase === "open") {
      const id = window.setTimeout(() => emailInputRef.current?.focus({ preventScroll: true }), 120);
      return () => window.clearTimeout(id);
    }
  }, [phase]);

  // Wall grain: drawn once as a bitmap. (An SVG noise filter would be re-rendered
  // by the browser every time the camera scales, which is what made the push stutter.)
  useEffect(() => {
    const size = 256;
    const canvas = document.createElement("canvas");
    canvas.width = canvas.height = size;
    const ctx = canvas.getContext("2d");
    if (!ctx || !pageRef.current) return;
    const image = ctx.createImageData(size, size);
    for (let i = 0; i < image.data.length; i += 4) {
      image.data[i] = image.data[i + 1] = image.data[i + 2] = 255;
      image.data[i + 3] = Math.random() * 120;
    }
    ctx.putImageData(image, 0, 0);
    pageRef.current.style.setProperty("--noise", `url(${canvas.toDataURL()})`);
  }, []);

  useEffect(() => () => timers.current.forEach((id) => window.clearTimeout(id)), []);

  function openDoor() {
    if (phase !== "idle") return;
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduceMotion) {
      setPhase("open");
      return;
    }
    setPhase("opening");
    timers.current.push(
      window.setTimeout(() => setPhase("entering"), ENTER_AT),
      window.setTimeout(() => setPhase("open"), OPEN_AT)
    );
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setNote(null);

    if (!email.trim()) {
      setEmailError("Enter your email address.");
      setPasswordError(null);
      emailInputRef.current?.focus();
      return;
    }
    if (!EMAIL_PATTERN.test(email.trim())) {
      setEmailError("Enter a valid email address, like you@example.com.");
      setPasswordError(null);
      emailInputRef.current?.focus();
      return;
    }
    setEmailError(null);

    if (!password) {
      setPasswordError("Enter your password.");
      passwordInputRef.current?.focus();
      return;
    }
    setPasswordError(null);

    // TODO(backend): replace with the real sign-in request.
    setNote("Sign-in isn’t connected yet. Continue as a guest to look around.");
  }

  return (
    <main className="login-page" data-phase={phase} ref={pageRef}>
      {/* ---------- Sign-in layout (same split as the rooms screen) ---------- */}
      <div className="login-layout" ref={layoutRef}>
        <div className="login-photo">
          <a className="login-brand" href="/" aria-label="ProxiSpeak home">
            <BrandLogo tone="dark" />
          </a>
          <div className="login-intro">
            <h1 id="login-title">Welcome back.</h1>
            <p className="login-lede">Sign in to rejoin your office and the people already in it.</p>
          </div>
        </div>

        <div className="login-panel-area">
          <header className="login-header">
            <span>New here?</span>
            <button
              className="login-link-button"
              type="button"
              onClick={() => setNote("Account creation isn’t available yet. Continue as a guest for now.")}
            >
              Create an account
            </button>
          </header>

          <div className="login-body">
            <div className="login-stack">
              <section className="login-card" aria-label="Sign in">
                <form onSubmit={handleSubmit} noValidate>
                  <div className="login-field">
                    <label htmlFor="email">Email address</label>
                    <input
                      id="email"
                      ref={emailInputRef}
                      type="email"
                      placeholder="you@example.com"
                      autoComplete="email"
                      value={email}
                      onChange={(event) => {
                        setEmail(event.target.value);
                        if (emailError) setEmailError(null);
                      }}
                      aria-invalid={emailError ? true : undefined}
                      aria-describedby={emailError ? "email-error" : undefined}
                    />
                    {emailError && (
                      <p id="email-error" className="login-error" role="alert">
                        {emailError}
                      </p>
                    )}
                  </div>

                  <div className="login-field">
                    <label htmlFor="password">Password</label>
                    <div className="login-input-wrap">
                      <input
                        id="password"
                        ref={passwordInputRef}
                        type={showPassword ? "text" : "password"}
                        placeholder="Enter your password"
                        autoComplete="current-password"
                        value={password}
                        onChange={(event) => {
                          setPassword(event.target.value);
                          if (passwordError) setPasswordError(null);
                        }}
                        aria-invalid={passwordError ? true : undefined}
                        aria-describedby={passwordError ? "password-error" : undefined}
                      />
                      <button
                        className="login-reveal"
                        type="button"
                        aria-label={showPassword ? "Hide password" : "Show password"}
                        aria-pressed={showPassword}
                        onClick={() => setShowPassword((value) => !value)}
                      >
                        {showPassword ? "Hide" : "Show"}
                      </button>
                    </div>
                    {passwordError && (
                      <p id="password-error" className="login-error" role="alert">
                        {passwordError}
                      </p>
                    )}
                  </div>

                  {note && (
                    <p className="login-note" role="status">
                      {note}
                    </p>
                  )}

                  <button className="login-button login-button--primary" type="submit">
                    Sign in
                  </button>
                </form>

                <div className="login-or" aria-hidden="true">
                  <span>or</span>
                </div>

                <button className="login-button login-button--secondary" type="button" onClick={() => navigate("/rooms")}>
                  Continue as a guest
                </button>
              </section>
            </div>
          </div>
        </div>
      </div>

      {/* ---------- Door scene ---------- */}
      <div className="entry-scene" aria-hidden={phase === "open" ? true : undefined}>
        <a className="entry-brand" href="/" tabIndex={phase === "idle" ? 0 : -1} aria-label="ProxiSpeak home">
          <BrandLogo tone="dark" />
        </a>

        <div className="camera">
          <div className="wall" />
          <div className="wall-glow lit" />
          <div className="baseboard" />
          <div className="floor" />
          <div className="spill lit" />
          <span className="sconce sconce--left lit" />
          <span className="sconce sconce--right lit" />

          <div className="doorway">
            <div className="casing">
              <div className="opening">
                <div className="interior">
                  <div className="interior-photo" />
                  <div className="interior-glow" />
                </div>

                <button
                  className="door"
                  type="button"
                  aria-label="Open the office door to sign in"
                  aria-expanded={phase !== "idle"}
                  disabled={phase !== "idle"}
                  onClick={openDoor}
                >
                  <OfficeDoor />
                  <span className="door-shade" />
                  <span className="door-sheen" />
                </button>

                <span className="jamb-shade" />
              </div>
            </div>
            <span className="threshold" />
          </div>
        </div>

        <div className="flood" />

        <p className="entry-hint">
          <span>A quieter place for better conversations.</span>
          <strong>Open the door to sign in</strong>
        </p>
      </div>
    </main>
  );
}
