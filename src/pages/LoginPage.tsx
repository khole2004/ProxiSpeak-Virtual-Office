import { useState, type FormEvent } from "react";

export default function LoginPage() {
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
    <main className="login-page">
      <div className="login-shell">
        <a className="brand" href="/" aria-label="ProxiSpeak home">
          <span className="brand-mark" aria-hidden="true">
            <svg viewBox="0 0 32 32" fill="none">
              <path
                d="M8 23.5V8.5h8.4a5.1 5.1 0 0 1 0 10.2H8"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <circle cx="23.5" cy="22.5" r="2.5" fill="currentColor" />
            </svg>
          </span>
          <span>ProxiSpeak</span>
        </a>

        <section className="login-card" aria-labelledby="login-title">
          <div className="login-heading">
            <p className="eyebrow">YOUR WORKSPACE</p>
            <h1 id="login-title">Welcome back<span>.</span></h1>
            <p className="subtitle">
              Sign in to pick up where you left off.
            </p>
          </div>

          <form onSubmit={handleSubmit}>
            <div className="field-group">
              <label htmlFor="email">Email address</label>
              <input
                id="email"
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
            onClick={() =>
              setMessage(
                "Guest entry will be connected when rooms are implemented."
              )
            }
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
        </section>

        <p className="page-footer">A shared space for better conversations.</p>
      </div>
    </main>
  );
}
