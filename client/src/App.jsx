
import { useState } from "react";
import Login from "./Login";
import CreateAccount from "./CreateAccount";
import MeetingLobby from "./MeetingLobby";
import Workspace from "./Workspace";
import Home from "./Home.jsx";
import { loginUser, registerUser } from "./services/auth";

export default function App() {
  const [session, setSession] = useState(null);
  const [page, setPage] = useState("home");
  const [joinedMeeting, setJoinedMeeting] = useState(false);

  async function handleLogin(credentials) {
    try {
      const result = await loginUser({
        email: credentials.email,
        password: credentials.password,
      });

      setSession({ ...result.user, token: result.token });
      setJoinedMeeting(false);
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
      setJoinedMeeting(false);
    } catch (error) {
      alert(error.message || "Unable to create your account.");
    }
  }

  // Show the Home page first
  if (!session && page === "home") {
    return (
      <Home
        onLogin={() => setPage("login")}
        onGetStarted={() => setPage("register")}
      />
    );
  }

  // Show the meeting lobby after successful authentication
  if (session && !joinedMeeting) {
    return (
      <MeetingLobby
        displayName={session.displayName}
        onJoin={() => setJoinedMeeting(true)}
      />
    );
  }

  // Show the workspace after joining the meeting
  if (session && joinedMeeting) {
    return <Workspace initialName={session.displayName} />;
  }

  // Show the registration page
  if (page === "register") {
    return (
      <CreateAccount
        onRegister={handleRegister}
        onBackToLogin={() => setPage("login")}
      />
    );
  }

  // Show the login page
  return (
    <Login
      onLogin={handleLogin}
      onCreateAccount={() => setPage("register")}
    />
  );
}
