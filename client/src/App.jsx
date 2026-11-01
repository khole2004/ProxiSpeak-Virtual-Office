import { lazy, Suspense, useState, useEffect } from "react";
import { BrowserRouter, Navigate, Route, Routes, useNavigate, useLocation } from "react-router-dom";
import LoginPage from "./pages/LoginPage";
import RoomsPage from "./pages/RoomsPage";
import Workspace from "./Workspace";
import Login from "./Login";
import CreateAccount from "./CreateAccount";
import Home from "./Home";
import { readSession } from "./services/demoSession";
import { loginUser, registerUser } from "./services/auth";

const OfficePage = lazy(() => import("./pages/OfficePage"));

function OfficeLoading() {
  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        display: "grid",
        placeItems: "center",
        background: "#14261f",
        color: "#f4efe2",
        fontFamily: "DM Sans, sans-serif",
      }}
    >
      Opening the office…
    </div>
  );
}

// Wrapper to pass room/session info into Workspace
function WorkspaceView() {
  const navigate = useNavigate();
  const [displayName, setDisplayName] = useState(() => {
    try {
      const sess = readSession();
      return sess?.displayName || "";
    } catch {
      return "";
    }
  });

  return (
    <div style={{ position: "relative", minHeight: "100vh" }}>
      {/* Top Banner with view switcher */}
      <div
        style={{
          background: "#0f172a",
          borderBottom: "1px solid #1e293b",
          padding: "8px 20px",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          color: "#94a3b8",
          fontSize: "13px",
          zIndex: 100,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          <span style={{ color: "#38bdf8", fontWeight: "700" }}>ProxiSpeak Ecosystem</span>
          <span>|</span>
          <span style={{ color: "#22c55e", fontWeight: "600" }}>● Active View: 2D Spatial Audio Workspace</span>
        </div>
        <div style={{ display: "flex", gap: "10px" }}>
          <button
            type="button"
            onClick={() => navigate("/office-3d")}
            style={{
              background: "#334155",
              color: "#f8fafc",
              border: "none",
              padding: "5px 12px",
              borderRadius: "6px",
              cursor: "pointer",
              fontSize: "12px",
              fontWeight: "600",
            }}
          >
            🎮 Switch to 3D Office (Three.js)
          </button>
          <button
            type="button"
            onClick={() => navigate("/rooms")}
            style={{
              background: "#1e293b",
              color: "#94a3b8",
              border: "none",
              padding: "5px 12px",
              borderRadius: "6px",
              cursor: "pointer",
              fontSize: "12px",
            }}
          >
            🏢 Rooms Selection
          </button>
        </div>
      </div>

      <Workspace
        initialName={displayName}
        onGoToLogin={() => navigate("/login-db")}
        onGoToHome={() => navigate("/home")}
      />
    </div>
  );
}

// Wrapper for 3D office with switcher back to 2D workspace
function Office3DView() {
  const navigate = useNavigate();
  return (
    <div style={{ position: "relative" }}>
      <div
        style={{
          position: "fixed",
          top: "12px",
          right: "12px",
          zIndex: 9999,
          display: "flex",
          gap: "8px",
        }}
      >
        <button
          type="button"
          onClick={() => navigate("/office")}
          style={{
            background: "#22c55e",
            color: "#ffffff",
            border: "none",
            padding: "8px 16px",
            borderRadius: "8px",
            cursor: "pointer",
            fontWeight: "700",
            boxShadow: "0 4px 12px rgba(0,0,0,0.3)",
          }}
        >
          🎧 Switch to Live WebRTC Audio Workspace
        </button>
        <button
          type="button"
          onClick={() => navigate("/rooms")}
          style={{
            background: "#0f172a",
            color: "#e2e8f0",
            border: "1px solid #334155",
            padding: "8px 14px",
            borderRadius: "8px",
            cursor: "pointer",
            fontWeight: "600",
          }}
        >
          🏢 Rooms
        </button>
      </div>
      <Suspense fallback={<OfficeLoading />}>
        <OfficePage />
      </Suspense>
    </div>
  );
}

export default function App() {
  const [session, setSession] = useState(null);

  async function handleLogin(credentials) {
    try {
      const result = await loginUser({
        displayName: credentials.displayName,
        email: credentials.email,
        password: credentials.password,
      });
      setSession({ ...result.user, token: result.token });
      window.location.href = "/office";
    } catch (error) {
      alert(error.message || "Unable to log in.");
    }
  }

  async function handleRegister(userData) {
    try {
      const result = await registerUser({
        displayName: userData.displayName,
        email: userData.email,
        password: userData.password,
      });
      setSession({ ...result.user, token: result.token });
      window.location.href = "/office";
    } catch (error) {
      alert(error.message || "Unable to create your account.");
    }
  }

  return (
    <BrowserRouter>
      <Routes>
        {/* Step 1: Parth's 3D Door Login Page (The official entry point!) */}
        <Route path="/" element={<LoginPage />} />

        {/* Step 2: Parth's Rooms selection */}
        <Route path="/rooms" element={<RoomsPage />} />

        {/* Step 3: Real-time Audio Proximity & Avatar Workspace */}
        <Route path="/office" element={<WorkspaceView />} />
        <Route path="/workspace" element={<WorkspaceView />} />

        {/* Step 4: Parth's 3D Three.js Office */}
        <Route path="/office-3d" element={<Office3DView />} />

        {/* Direct MongoDB Atlas Authentication pages */}
        <Route
          path="/login-db"
          element={
            <Login
              onLogin={handleLogin}
              onCreateAccount={() => (window.location.href = "/register-db")}
              onCancel={() => (window.location.href = "/office")}
            />
          }
        />
        <Route
          path="/register-db"
          element={
            <CreateAccount
              onRegister={handleRegister}
              onBackToLogin={() => (window.location.href = "/login-db")}
              onCancel={() => (window.location.href = "/office")}
            />
          }
        />

        {/* Marketing / Overview page */}
        <Route
          path="/home"
          element={
            <Home
              onLogin={() => (window.location.href = "/login-db")}
              onGetStarted={() => (window.location.href = "/rooms")}
              onOpenWorkspace={() => (window.location.href = "/office")}
            />
          }
        />

        {/* Fallback */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
