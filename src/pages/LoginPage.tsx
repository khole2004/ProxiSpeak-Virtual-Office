
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
      <div className="ambient ambient-one" />
      <div className="ambient ambient-two" />

      <section className="login-card">
        <a className="brand" href="/" aria-label="ProxiSpeak home">
          <span className="brand-icon">P</span>
          <span>Proxi<span className="brand-accent">Speak</span></span>
        </a>

        <div className="login-heading">
          <p className="eyebrow">YOUR SPACE. YOUR PEOPLE.</p>
          <h1>Welcome back<span>.</span></h1>
          <p className="subtitle">
            Your space is waiting. Pick up where you left off.
          </p>
        </div>

        <form onSubmit={handleSubmit}>
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

          <div className="password-label">
            <label htmlFor="password">Password</label>
            <button
              className="text-button"
              type="button"
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

          {message && (
            <p className="form-message" role="status">
              {message}
            </p>
          )}

          <button className="primary-button" type="submit">
            Sign in <span aria-hidden="true">↗</span>
          </button>
        </form>

        <div className="separator"><span>OR</span></div>

        <button
          className="guest-button"
          type="button"
          onClick={() =>
            setMessage("Guest entry will be connected when rooms are implemented.")
          }
        >
          Continue as a guest <span aria-hidden="true">→</span>
        </button>

        <p className="signup-text">
          New to ProxiSpeak? <button
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

      <footer className="page-footer">
        MADE FOR CONVERSATIONS, NOT DISTANCE.
      </footer>
    </main>
  );
}
