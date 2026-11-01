
import { useState } from "react";
import "./Home.css";

const avatars = [
  { name: "Alex Morgan", role: "Product Designer", emoji: "👨🏻‍💻", color: "avatar-purple" },
  { name: "Jordan Lee", role: "Frontend Developer", emoji: "👩🏻‍💻", color: "avatar-pink" },
  { name: "Sam Taylor", role: "Backend Developer", emoji: "🧑🏽‍💻", color: "avatar-blue" },
  { name: "You", role: "Join the conversation", emoji: "😊", color: "avatar-orange" },
];

const features = [
  {
    icon: "🎧",
    title: "Natural voice chat",
    description:
      "Talk naturally with teammates without clicking buttons every time you want to speak.",
  },
  {
    icon: "📍",
    title: "Proximity-based audio",
    description:
      "Hear people nearby clearly. As you move away, their voices gradually become quieter.",
  },
  {
    icon: "🏢",
    title: "Virtual office",
    description:
      "Move around a shared virtual workspace and connect with your team in a more natural way.",
  },
  {
    icon: "🤝",
    title: "Team collaboration",
    description:
      "Make quick conversations, collaborate with colleagues, and feel connected while working remotely.",
  },
];

export default function Home({ onLogin, onGetStarted, onOpenWorkspace }) {
  const [activeAvatar, setActiveAvatar] = useState(0);
  const [demoMicOn, setDemoMicOn] = useState(false);

  const handleExplore = () => {
    document.getElementById("features")?.scrollIntoView({
      behavior: "smooth",
    });
  };

  return (
    <main className="home-page">
      {/* Navigation */}
      <header className="home-navbar">
        <a
          href="#home"
          className="home-brand"
          aria-label="ProxiSpeak home"
          onClick={(event) => {
            event.preventDefault();
            window.scrollTo({ top: 0, behavior: "smooth" });
          }}
        >
          <span className="brand-mark">
            <span />
            <span />
            <span />
          </span>
          <span>
            Proxi<span className="brand-accent">Speak</span>
          </span>
        </a>

        <nav className="home-nav-links" aria-label="Main navigation">
          <a href="#features">Features</a>
          <a href="#how-it-works">How it works</a>
        </nav>

        <div className="home-nav-actions">
          {onOpenWorkspace && (
            <button className="nav-login" onClick={onOpenWorkspace} style={{ background: "#22c55e", color: "#ffffff", fontWeight: "600", marginRight: "8px" }}>
              🏢 Enter Virtual Office
            </button>
          )}
          <button className="nav-login" onClick={onLogin}>
            Log in
          </button>
          <button className="primary-button nav-cta" onClick={onGetStarted}>
            Get started <span aria-hidden="true">↗</span>
          </button>
        </div>
      </header>

      {/* Hero */}
      <section className="home-hero" id="home">
        <div className="hero-content">
          <div className="hero-eyebrow">
            <span className="eyebrow-dot" />
            A NEW WAY TO CONNECT
          </div>

          <h1>
            Work together,
            <br />
            <span className="hero-gradient-text">feel closer.</span>
          </h1>

          <p className="hero-description">
            Meet ProxiSpeak — a virtual office where conversations happen
            naturally. Move around, meet your teammates, and let distance
            control how you hear each other.
          </p>

          <div className="hero-actions">
            <button className="primary-button hero-primary" onClick={onOpenWorkspace || onGetStarted}>
              Enter your workspace <span aria-hidden="true">→</span>
            </button>

            <button className="secondary-button" onClick={handleExplore}>
              Explore features <span aria-hidden="true">↓</span>
            </button>
          </div>

          <div className="hero-social-proof">
            <div className="mini-avatars" aria-hidden="true">
              <span>👨🏻</span>
              <span>👩🏻</span>
              <span>🧑🏽</span>
              <span>😊</span>
            </div>
            <p>
              <strong>Closer conversations.</strong>
              <br />
              A more connected team.
            </p>
          </div>
        </div>

        {/* Animated virtual office preview */}
        <div className="hero-visual">
          <div className="visual-orbit orbit-one" />
          <div className="visual-orbit orbit-two" />
          <div className="visual-glow" />

          <div className="floating-card floating-card-top">
            <span className="status-indicator" />
            <span>Workspace is active</span>
          </div>

          <div className="visual-window">
            <div className="visual-window-header">
              <div className="window-dots" aria-hidden="true">
                <span />
                <span />
                <span />
              </div>
              <span className="window-title">proxispeak / workspace</span>
              <span className="window-live">
                <span /> LIVE
              </span>
            </div>

            <div className="office-scene">
              <div className="scene-label">
                <span className="scene-label-icon">✦</span>
                CREATIVE STUDIO
              </div>

              <div className="scene-grid" aria-hidden="true" />

              <div className="office-plant plant-left" aria-hidden="true">
                <span>🌿</span>
              </div>
              <div className="office-plant plant-right" aria-hidden="true">
                <span>🪴</span>
              </div>

              <div className="office-desk desk-left">
                <div className="desk-screen">
                  <span className="screen-line" />
                  <span className="screen-line short" />
                  <span className="screen-glow" />
                </div>
                <div className="desk-surface" />
                <div className="desk-leg" />
              </div>

              <div className="office-desk desk-right">
                <div className="desk-screen screen-purple">
                  <span className="screen-line" />
                  <span className="screen-line short" />
                  <span className="screen-glow" />
                </div>
                <div className="desk-surface" />
                <div className="desk-leg" />
              </div>

              <div className="room-person person-one">
                <button
                  type="button"
                  className={`person-avatar ${avatars[0].color} ${
                    activeAvatar === 0 ? "person-selected" : ""
                  }`}
                  onClick={() => setActiveAvatar(0)}
                  aria-label="Select Alex Morgan"
                >
                  {avatars[0].emoji}
                </button>
                <span className="person-name">Alex</span>
                {activeAvatar === 0 && (
                  <span className="person-speaking">Nearby</span>
                )}
              </div>

              <div className="room-person person-two">
                <button
                  type="button"
                  className={`person-avatar ${avatars[1].color} ${
                    activeAvatar === 1 ? "person-selected" : ""
                  }`}
                  onClick={() => setActiveAvatar(1)}
                  aria-label="Select Jordan Lee"
                >
                  {avatars[1].emoji}
                </button>
                <span className="person-name">Jordan</span>
                {activeAvatar === 1 && (
                  <span className="person-speaking">Nearby</span>
                )}
              </div>

              <div className="room-person person-three">
                <button
                  type="button"
                  className={`person-avatar ${avatars[2].color} ${
                    activeAvatar === 2 ? "person-selected" : ""
                  }`}
                  onClick={() => setActiveAvatar(2)}
                  aria-label="Select Sam Taylor"
                >
                  {avatars[2].emoji}
                </button>
                <span className="person-name">Sam</span>
                {activeAvatar === 2 && (
                  <span className="person-speaking">Nearby</span>
                )}
              </div>

              <div className="distance-ring ring-one" aria-hidden="true" />
              <div className="distance-ring ring-two" aria-hidden="true" />

              <div className="scene-bottom-label">
                <span className="scene-location-dot" />
                MEETING AREA
              </div>
            </div>

            <div className="visual-window-footer">
              <div className="footer-participants">
                <div className="participant-stack" aria-hidden="true">
                  <span>👨🏻</span>
                  <span>👩🏻</span>
                  <span>🧑🏽</span>
                </div>
                <span>3 teammates online</span>
              </div>

              <button
                type="button"
                className={`demo-mic-button ${demoMicOn ? "mic-active" : ""}`}
                onClick={() => setDemoMicOn((previous) => !previous)}
                aria-pressed={demoMicOn}
              >
                <span>{demoMicOn ? "🎙️" : "🎤"}</span>
                {demoMicOn ? "Mic preview on" : "Try mic preview"}
              </button>
            </div>
          </div>

          <div className="floating-card floating-card-bottom">
            <div className="audio-card-icon">♫</div>
            <div className="audio-card-copy">
              <strong>{demoMicOn ? "Voice preview" : "Spatial audio"}</strong>
              <span>{demoMicOn ? "Demo enabled" : "Distance-aware sound"}</span>
            </div>
            <div
              className={`audio-wave ${demoMicOn ? "audio-wave-active" : ""}`}
              aria-hidden="true"
            >
              {[12, 22, 15, 28, 18, 32, 14, 24, 10].map((height, index) => (
                <span
                  key={index}
                  style={{ "--bar-height": `${height}px`, "--bar-index": index }}
                />
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Feature strip */}
      <section className="home-feature-strip" aria-label="Key benefits">
        <div>
          <span className="strip-icon">◉</span>
          <span>Spatial voice technology</span>
        </div>
        <span className="strip-divider" />
        <div>
          <span className="strip-icon">⌁</span>
          <span>Natural conversations</span>
        </div>
        <span className="strip-divider" />
        <div>
          <span className="strip-icon">✧</span>
          <span>Built for remote teams</span>
        </div>
      </section>

      {/* Features */}
      <section className="home-features" id="features">
        <div className="section-heading">
          <span className="section-eyebrow">WHY PROXISPEAK?</span>
          <h2>
            Remote work,
            <br />
            <span className="hero-gradient-text">with a human touch.</span>
          </h2>
          <p>
            Bring the spontaneous conversations of an office into your virtual
            workspace.
          </p>
        </div>

        <div className="feature-grid">
          {features.map((feature, index) => (
            <article
              className="feature-card"
              key={feature.title}
              style={{ "--card-index": index }}
            >
              <div className="feature-icon">{feature.icon}</div>
              <h3>{feature.title}</h3>
              <p>{feature.description}</p>
              <span className="feature-arrow" aria-hidden="true">
                ↗
              </span>
            </article>
          ))}
        </div>
      </section>

      {/* How it works */}
      <section className="how-section" id="how-it-works">
        <div className="how-visual">
          <div className="how-visual-glow" />
          <div className="how-orbit orbit-a" />
          <div className="how-orbit orbit-b" />

          <div className="how-avatar how-avatar-one">👩🏻‍💻</div>
          <div className="how-avatar how-avatar-two">👨🏽‍💻</div>
          <div className="how-avatar how-avatar-three">👩🏾‍💻</div>

          <div className="how-center-icon">
            <span>♫</span>
          </div>

          <div className="how-sound sound-one" />
          <div className="how-sound sound-two" />
          <div className="how-sound sound-three" />

          <span className="how-caption caption-one">Closer = louder</span>
          <span className="how-caption caption-two">Farther = quieter</span>
        </div>

        <div className="how-content">
          <span className="section-eyebrow">SIMPLE BY DESIGN</span>
          <h2>
            Just move.
            <br />
            <span className="hero-gradient-text">Stay connected.</span>
          </h2>
          <p>
            ProxiSpeak makes virtual interactions feel more natural. Your
            position in the room helps determine how clearly you hear other
            people.
          </p>

          <div className="how-steps">
            <div className="how-step">
              <span className="step-number">01</span>
              <div>
                <h3>Join your workspace</h3>
                <p>Enter a shared virtual room with your teammates.</p>
              </div>
            </div>

            <div className="how-step">
              <span className="step-number">02</span>
              <div>
                <h3>Move around naturally</h3>
                <p>Explore the room and approach teammates to talk.</p>
              </div>
            </div>

            <div className="how-step">
              <span className="step-number">03</span>
              <div>
                <h3>Experience spatial audio</h3>
                <p>Hear nearby teammates more clearly as distance changes.</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Final CTA with moving project-name watermark */}
      <section className="home-final-cta">
        <div className="cta-watermark" aria-hidden="true">
          PROXISPEAK&nbsp;&nbsp; PROXISPEAK&nbsp;&nbsp;
        </div>

        <div className="cta-content">
          <span className="cta-eyebrow">
            YOUR VIRTUAL OFFICE AWAITS
          </span>
          <h2>
            Great conversations
            <br />
            start with <span>being close.</span>
          </h2>
          <p>
            Bring your team together in a workspace that feels a little more
            like being there.
          </p>
          <button className="primary-button cta-button" onClick={onGetStarted}>
            Get started with ProxiSpeak <span aria-hidden="true">→</span>
          </button>
        </div>

        <span className="cta-decoration cta-decoration-one" aria-hidden="true" />
        <span className="cta-decoration cta-decoration-two" aria-hidden="true" />
      </section>

      {/* Footer */}
      <footer className="home-footer">
        <a
          href="#home"
          className="home-brand footer-brand"
          onClick={(event) => {
            event.preventDefault();
            window.scrollTo({ top: 0, behavior: "smooth" });
          }}
        >
          <span className="brand-mark">
            <span />
            <span />
            <span />
          </span>
          <span>
            Proxi<span className="brand-accent">Speak</span>
          </span>
        </a>

        <p>Closer conversations. Better collaboration.</p>

        <div className="footer-right">
          <span>Made for teams, wherever they work.</span>
          <span>© {new Date().getFullYear()} ProxiSpeak</span>
        </div>
      </footer>
    </main>
  );
}
