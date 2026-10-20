import { useRef, useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import BrandLogo from "../components/BrandLogo";

export default function LoginPage() {
  const navigate = useNavigate();
  const [doorOpen, setDoorOpen] = useState(false);
  const emailInputRef = useRef<HTMLInputElement>(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [message, setMessage] = useState("");

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("");

    if (!email.trim() || !password) {
      setMessage("Please enter your email and password.");
      return;
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setMessage("Please enter a valid email address.");
      return;
    }

    setMessage(
      "The interface is working! Authentication will be connected later."
    );
  }

  return (
    <main className={`login-page${doorOpen ? " door-open" : ""}`}>
      <a className="brand" href="/" aria-label="ProxiSpeak home">
        <BrandLogo />
      </a>

      <section className="login-main" aria-labelledby="login-title">
        <div className="entry-stage">
          <div className="login-card">
            <div className="login-heading">
              <p className="eyebrow">YOUR WORKSPACE</p>
              <h1 id="login-title">
                Welcome back<span>.</span>
              </h1>
              <p className="subtitle">
                Sign in to pick up where you left off.
              </p>
            </div>

            <form onSubmit={handleSubmit}>
              <div className="field-group">
                <label htmlFor="email">Email address</label>
                <input
                  id="email"
                  ref={emailInputRef}
                  type="email"
                  placeholder="you@example.com"
                  autoComplete="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  required
                />
              </div>

              <div className="field-group">
                <div className="password-label">
                  <label htmlFor="password">Password</label>
                  <button
                    className="text-button"
                    type="button"
                    aria-label={showPassword ? "Hide password" : "Show password"}
                    aria-pressed={showPassword}
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? "Hide" : "Show"}
                  </button>
                </div>
                <input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="Enter your password"
                  autoComplete="current-password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  required
                />
              </div>

              {message && (
                <p className="form-message" role="status">
                  {message}
                </p>
              )}

              <button className="primary-button" type="submit">
                Sign in <span aria-hidden="true">→</span>
              </button>
            </form>

            <div className="separator">
              <span>OR</span>
            </div>

            <button
              className="guest-button"
              type="button"
              onClick={() => navigate("/rooms")}
            >
              Continue as a guest <span aria-hidden="true">→</span>
            </button>

            <p className="signup-text">
              New around here?{" "}
              <button
                className="text-button"
                type="button"
                onClick={() =>
                  setMessage("Account creation will be added in a future step.")
                }
              >
                Create an account
              </button>
            </p>
          </div>

          <div className="doorway" aria-hidden={doorOpen}>
            <span className="door-contact-shadow" aria-hidden="true" />
            <span className="door-threshold" aria-hidden="true" />
            <button
              className="office-door"
              type="button"
              aria-label="Open the office door to sign in"
              aria-expanded={doorOpen}
              disabled={doorOpen}
              onClick={() => setDoorOpen(true)}
              onTransitionEnd={(event) => {
                if (event.propertyName === "transform") {
                  emailInputRef.current?.focus();
                }
              }}
            >
              <span className="door-back" aria-hidden="true">
                <span className="door-back-panel" />
              </span>
              <span className="door-glass" aria-hidden="true">
                <span className="glass-reflection" />
              </span>
              <span className="door-plaque">PROXISPEAK</span>
              <span className="door-panel door-panel-top" />
              <span className="door-panel door-panel-bottom" />
              <span className="door-handle" />
            </button>
          </div>
        </div>
      </section>

      <p className="entry-caption" aria-hidden={doorOpen}>
        A quieter place for better conversations.
        <span>Click the door to enter</span>
      </p>
    </main>
  );
}
