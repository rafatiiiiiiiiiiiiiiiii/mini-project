import { useEffect, useState } from "react";
import axios from "axios";

const api = axios.create({
  baseURL: "http://localhost:8000",
  withCredentials: true
});

function App() {
  const [mode, setMode] = useState("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [text, setText] = useState("");
  const [messages, setMessages] = useState([]);
  const [user, setUser] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  async function loadMessages() {
    const response = await api.get("/messages");
    setMessages(response.data);
  }

  async function checkAuth() {
    try {
      const response = await api.get("/auth/me");
      setUser(response.data.user);
      setError("");
      await loadMessages();
    } catch (error) {
      setUser(null);
      setMessages([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    checkAuth();
  }, []);

  async function handleAuthSubmit(event) {
    event.preventDefault();
    setError("");
    try {
      const endpoint = mode === "signup" ? "/auth/signup" : "/auth/signin";
      const response = await api.post(endpoint, { email, password });
      setUser(response.data.user);
      setEmail("");
      setPassword("");
      setText("");
      await loadMessages();
    } catch (error) {
      setError(error.response?.data?.error || "request failed");
    }
  }

  async function handleLogout() {
    try {
      await api.post("/auth/logout");
      setUser(null);
      setMessages([]);
      setText("");
      setError("");
    } catch (error) {
      setError(error.response?.data?.error || "logout failed");
    }
  }

  async function handleMessageSubmit(event) {
    event.preventDefault();
    setError("");
    try {
      const response = await api.post("/messages", { text });
      setMessages(response.data);
      setText("");
    } catch (error) {
      setError(error.response?.data?.error || "request failed");
    }
  }

  if (loading) {
    return (
      <div className="page">
        <div className="card">
          <h1>Mini Project Template</h1>
          <p>Loading...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="page">
        <div className="card auth-card">
          <h1>Mini Project Template</h1>
          <p className="subtitle">Sign in or create an account to access the message area.</p>

          <div className="tabs">
            <button
              type="button"
              className={mode === "signin" ? "tab active" : "tab"}
              onClick={() => { setMode("signin"); setError(""); }}
            >
              Sign in
            </button>
            <button
              type="button"
              className={mode === "signup" ? "tab active" : "tab"}
              onClick={() => { setMode("signup"); setError(""); }}
            >
              Sign up
            </button>
          </div>

          <form onSubmit={handleAuthSubmit} className="auth-form">
            <input
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="Email"
              required
            />
            <input
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="Password"
              required
            />
            <button type="submit">
              {mode === "signup" ? "Create account" : "Sign in"}
            </button>
          </form>

          {error && <p className="error">{error}</p>}
        </div>
      </div>
    );
  }

  return (
    <div className="page">
      <div className="card">
        <div className="header">
          <div>
            <h1>Mini Project Template</h1>
            <p className="subtitle">Connected as {user.email}</p>
          </div>
          <button type="button" className="logout-button" onClick={handleLogout}>
            Logout
          </button>
        </div>

        <form onSubmit={handleMessageSubmit} className="message-form">
          <input
            value={text}
            onChange={(event) => setText(event.target.value)}
            placeholder="Type a message"
          />
          <button type="submit">Send</button>
        </form>

        {error && <p className="error">{error}</p>}

        <ul className="message-list">
          {messages.map((message) => (
            <li key={message._id} className="message-item">
              {message.text}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

export default App;
