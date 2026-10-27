import { useState } from "react";
import "./Login.css";

export default function Login({ onLogin, onCreateAccount }) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  function handleSubmit(event) {
    event.preventDefault();

    onLogin({
      displayName: name.trim() || email.trim().split("@")[0],
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
            Welcome back<span>.</span>
          </h1>

          <p className="login-subtitle">
            Sign in and reconnect with your team.
          </p>

          <form className="login-form" onSubmit={handleSubmit}>
            <label htmlFor="display-name">Your name</label>
            <input
              id="display-name"
              type="text"
              placeholder="Enter your name"
              value={name}
              onChange={(event) => setName(event.target.value)}
              maxLength={30}
              autoComplete="name"
              required
            />

            <label htmlFor="login-email">Email address</label>
            <input
              id="login-email"
              type="email"
              placeholder="you@example.com"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              autoComplete="email"
              required
            />

            <div className="login-password-label">
              <label htmlFor="login-password">Password</label>

              <button
                type="button"
                className="login-text-button"
                onClick={() =>
                  alert("Password recovery will be added later.")
                }
              >
                Forgot password?
              </button>
            </div>

            <div className="login-password-input">
              <input
                id="login-password"
                type={showPassword ? "text" : "password"}
                placeholder="Enter your password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                autoComplete="current-password"
                required
              />

              <button
                type="button"
                className="password-toggle"
                onClick={() =>
                  setShowPassword((previous) => !previous)
                }
                aria-label={
                  showPassword ? "Hide password" : "Show password"
                }
              >
                {showPassword ? "Hide" : "Show"}
              </button>
            </div>

            <button className="login-submit" type="submit">
              Sign in <span>→</span>
            </button>
          </form>

          <p className="login-note">
            New to ProxiSpeak?{" "}
            <button
              className="login-text-button"
              type="button"
              onClick={onCreateAccount}
            >
              Create an account
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
            <span /> A NEW WAY TO CONNECT
          </div>

          <h2>
            Great conversations happen <em>naturally.</em>
          </h2>

          <p className="login-promo-description">
            Step into your virtual office. Move freely, meet your
            teammates, and feel closer even when working remotely.
          </p>

          <div className="login-feature">
            <div className="feature-icon">01</div>
            <div>
              <h3>Walk up and talk</h3>
              <p>
                Make everyday team conversations feel effortless.
              </p>
            </div>
          </div>

          <div className="login-feature">
            <div className="feature-icon">02</div>
            <div>
              <h3>Spatial voice</h3>
              <p>
                Hear teammates based on where they are in the room.
              </p>
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
