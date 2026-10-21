import { useState } from "react";
import "./Login.css";

export default function CreateAccount({ onRegister, onBackToLogin }) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");

  function handleSubmit(event) {
    event.preventDefault();
    setError("");

    if (password.length < 8) {
      setError("Password must contain at least 8 characters.");
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    if (typeof onRegister !== "function") {
      setError("Registration is not connected to the backend yet.");
      return;
    }

    onRegister({
      displayName: name.trim(),
      email: email.trim().toLowerCase(),
      password,
    });
  }

  return (
    <main className="login-page">
      <section className="login-left">
        <div className="login-brand">
          <div className="login-logo">P</div>
          <span>ProxiSpeak</span>
        </div>

        <div className="login-form-wrapper">
          <span className="login-eyebrow">
            YOUR VIRTUAL WORKSPACE
          </span>

          <h1>
            Create account<span>.</span>
          </h1>

          <p className="login-subtitle">
            Create your account and connect with your team.
          </p>

          <form className="login-form" onSubmit={handleSubmit}>
            <label htmlFor="register-name">Full name</label>
            <input
              id="register-name"
              type="text"
              placeholder="Enter your full name"
              value={name}
              onChange={(event) => setName(event.target.value)}
              maxLength={30}
              autoComplete="name"
              required
            />

            <label htmlFor="register-email">Email address</label>
            <input
              id="register-email"
              type="email"
              placeholder="you@example.com"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              autoComplete="email"
              required
            />

            <label htmlFor="register-password">Password</label>
            <div className="login-password-input">
              <input
                id="register-password"
                type={showPassword ? "text" : "password"}
                placeholder="Create a password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                autoComplete="new-password"
                minLength={8}
                required
              />

              <button
                type="button"
                className="password-toggle"
                onClick={() => setShowPassword((previous) => !previous)}
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? "Hide" : "Show"}
              </button>
            </div>

            <label htmlFor="confirm-password">Confirm password</label>
            <input
              id="confirm-password"
              type="password"
              placeholder="Re-enter your password"
              value={confirmPassword}
              onChange={(event) => setConfirmPassword(event.target.value)}
              autoComplete="new-password"
              minLength={8}
              required
            />

            {error && (
              <p className="register-error" role="alert">
                {error}
              </p>
            )}

            <button className="login-submit" type="submit">
              Create account <span>→</span>
            </button>
          </form>

          <p className="login-note">
            Already have an account?{" "}
            <button
              className="login-text-button"
              type="button"
              onClick={onBackToLogin}
            >
              Sign in
            </button>
          </p>

          <p className="login-bottom-note">
            Your space. Your team. Your conversation.
          </p>
        </div>
      </section>

      <aside className="login-right">
        <div className="login-orbit orbit-one" />
        <div className="login-orbit orbit-two" />

        <div className="login-promo">
          <div className="login-live">
            <span /> YOUR TEAM, CLOSER
          </div>

          <h2>
            Work together.
            <br />
            Feel <em>closer.</em>
          </h2>

          <p className="login-promo-description">
            Step into your virtual office and make teamwork feel
            natural, wherever you are.
          </p>

          <div className="login-feature">
            <div className="feature-icon">01</div>
            <div>
              <h3>One shared workspace</h3>
              <p>Meet your teammates in a virtual office.</p>
            </div>
          </div>

          <div className="login-feature">
            <div className="feature-icon">02</div>
            <div>
              <h3>Natural conversations</h3>
              <p>Move around and talk with spatial audio.</p>
            </div>
          </div>

          <div className="login-avatars" aria-hidden="true">
            <div className="promo-avatar avatar-a">A</div>
            <div className="promo-avatar avatar-b">J</div>
            <div className="promo-avatar avatar-c">Y</div>

            <div className="avatar-caption">
              <span className="online-dot" />
              Your team is waiting
            </div>
          </div>
        </div>

        <div className="login-right-footer">
          PROXISPEAK · BUILT FOR BETTER TEAMWORK
        </div>
      </aside>
    </main>
  );
}
