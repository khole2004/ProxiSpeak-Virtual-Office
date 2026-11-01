import { useState } from "react";
import Login from "./Login";
import CreateAccount from "./CreateAccount";
import MeetingLobby from "./MeetingLobby";
import Workspace from "./Workspace";
import Home from "./Home.jsx";
import { loginUser, registerUser } from "./services/auth";

export default function App() {
  const [session, setSession] = useState(null);
  // Default directly to the Virtual Office Workspace so it's immediately visible
  const [page, setPage] = useState("workspace");

  async function handleLogin(credentials) {
    try {
      const result = await loginUser({
        displayName: credentials.displayName,
        email: credentials.email,
        password: credentials.password,
      });

      setSession({ ...result.user, token: result.token });
      setPage("workspace");
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
      setPage("workspace");
    } catch (error) {
      alert(error.message || "Unable to create your account.");
    }
  }

  function handleLogout() {
    setSession(null);
  }

  // Show the Home / Marketing overview
  if (page === "home") {
    return (
      <Home
        onLogin={() => setPage("login")}
        onGetStarted={() => setPage("register")}
        onOpenWorkspace={() => setPage("workspace")}
      />
    );
  }

  // Show the registration page
  if (page === "register") {
    return (
      <CreateAccount
        onRegister={handleRegister}
        onBackToLogin={() => setPage("login")}
        onCancel={() => setPage("workspace")}
      />
    );
  }

  // Show the login page
  if (page === "login") {
    return (
      <Login
        onLogin={handleLogin}
        onCreateAccount={() => setPage("register")}
        onCancel={() => setPage("workspace")}
      />
    );
  }

  // Show the meeting lobby if desired
  if (page === "lobby") {
    return (
      <MeetingLobby
        displayName={session?.displayName || "Teammate"}
        onJoin={() => setPage("workspace")}
      />
    );
  }

  // DEFAULT & PRIMARY VIEW: The 2D Virtual Office Workspace with Avatars, WebRTC and Proximity Audio!
  return (
    <Workspace
      initialName={session ? session.displayName : ""}
      session={session}
      onGoToLogin={() => setPage("login")}
      onGoToHome={() => setPage("home")}
      onLogout={handleLogout}
    />
  );
}
