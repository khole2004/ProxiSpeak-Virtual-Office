
const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000";

async function authRequest(endpoint, userData) {
  let response;

  try {
    response = await fetch(`${API_URL}/api/auth/${endpoint}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(userData),
    });
  } catch {
    throw new Error(
      "Cannot connect to the server. Make sure the ProxiSpeak backend is running."
    );
  }

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(data.message || "Authentication failed.");
  }

  return data;
}

export function registerUser(userData) {
  return authRequest("register", userData);
}

export function loginUser(credentials) {
  return authRequest("login", credentials);
}
