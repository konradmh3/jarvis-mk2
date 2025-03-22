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
  const [messagesSent, setMessagesSent] = useState<string[]>([])

  const handleSendMessage = () => {
    if (input.trim()) {
      sendMessage(input);
      setMessagesSent([...messagesSent, input]);
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
        {messages.map((message, index) => (
        <div key={index} className="sever-message">
          Jarvis: {message}
          <div className="client-message">
            {messagesSent[index]? `${messagesSent[index]} :You` : ""}
        </div>
        </div>
        
      ))}

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
          className="text-input"
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
