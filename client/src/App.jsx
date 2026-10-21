
import { useState } from "react";
import Login from "./Login";
import CreateAccount from "./CreateAccount";
import MeetingLobby from "./MeetingLobby";
import Workspace from "./Workspace";
import { loginUser, registerUser } from "./services/auth";

export default function App() {
  const [session, setSession] = useState(null);
  const [page, setPage] = useState("login");
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

  if (session && !joinedMeeting) {
    return (
      <MeetingLobby
        displayName={session.displayName}
        onJoin={() => setJoinedMeeting(true)}
      />
    );
  }

  if (session && joinedMeeting) {
    return <Workspace initialName={session.displayName} />;
  }

  if (page === "register") {
    return (
      <CreateAccount
        onRegister={handleRegister}
        onBackToLogin={() => setPage("login")}
      />
    );
  }

  return (
    <Login
      onLogin={handleLogin}
      onCreateAccount={() => setPage("register")}
    />
  );
}
