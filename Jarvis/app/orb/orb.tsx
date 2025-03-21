import { useState } from "react";
import useWebSocket from "~/hooks/useWebSocket";
import "./orb.css";

export function OrbSocket() {
  // here we will connect to websocket on ws:://localhost:8080
  const {
    messages,
    startRecording,
    stopRecording,
    sendMessage,
    startStreaming,
  } = useWebSocket("ws://localhost:8083");
  const [input, setInput] = useState("");
  const [connected, setConnected] = useState(false);

  const handleSendMessage = () => {
    if (input.trim()) {
      sendMessage(input);
      setInput("");
    }
  };
  const connect = () => {
    console.log("connect");
    startStreaming();
    setConnected(true);
    }


  return (
    <div>
      {messages || "Loading..."}
      {/* button to call funcntion */}

      <button className={!connected ? "connect-button": "connect-button disabled"} onClick={connect}>
        Connect
      </button>
      <div className="text-input-container">
        <button
          className="record-button"
          onClick={startRecording}
        >
          Record
        </button>
        <button
          className="stop-record-button"
          onClick={stopRecording}
        >
          Stop
        </button>
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Type a message..."
          style={{ marginLeft: "10px" }}
        />{" "}
        
        <button className="send-text-button" onClick={handleSendMessage}>
          Send
        </button>
      </div>
    </div>
  );
}
