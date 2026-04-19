import { useEffect, useState } from "react";
import axios from "axios";

function App() {
  const [text, setText] = useState("");
  const [messages, setMessages] = useState([]);
  const [error, setError] = useState("");

  async function loadMessages() {
    try {
      const response = await axios.get("http://localhost:8000/messages");
      setMessages(response.data);
    } catch (error) {
      setError("failed to load messages");
    }
  }

  useEffect(() => {
    loadMessages();
  }, []);

  async function handleSubmit(event) {
    event.preventDefault();
    setError("");

    try {
      const response = await axios.post("http://localhost:8000/messages", {
        text
      });

      setMessages(response.data);
      setText("");
    } catch (error) {
      setError(error.response?.data?.error || "request failed");
    }
  }

  return (
    <div className="container">
      <h1>Mini Project Template</h1>

      <form onSubmit={handleSubmit}>
        <input
          value={text}
          onChange={(event) => setText(event.target.value)}
          placeholder="Type a message"
        />
        <button type="submit">Send</button>
      </form>

      {error && <p className="error">{error}</p>}

      <ul>
        {messages.map((message) => (
          <li key={message._id}>{message.text}</li>
        ))}
      </ul>
    </div>
  );
}

export default App;
