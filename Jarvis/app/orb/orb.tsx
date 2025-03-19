import { useState } from "react";
import useWebSocket from "~/hooks/useWebSocket";

export function OrbSocket() {
    // here we will connect to websocket on ws:://localhost:8080
    const { messages, startRecording, stopRecording, sendMessage, startStreaming} = useWebSocket("ws://localhost:8083");
    const [input, setInput] = useState("");
    


    const handleSendMessage = () => {
        if (input.trim()) {
            sendMessage(input);
            setInput("");
        }
    };

    return (
        <div>{messages || "Loading..."}
        {/* button to call funcntion */}
        <button style={{marginLeft: "10px", cursor: "pointer", border: "1px solid white"}} onClick={handleSendMessage}>Send Message</button>
        <button style={{marginLeft: "10px", cursor: "pointer", border: "1px solid white"}} onClick={startStreaming}>Start Streaming</button>
        <button style={{marginLeft: "10px", cursor: "pointer", border: "1px solid white"}} onClick={startRecording}>Start Recording</button>
        <button style={{marginLeft: "10px", cursor: "pointer", border: "1px solid white"}} onClick={stopRecording}>Stop Recording</button>
        <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Type a message..."
            style={{marginLeft: "10px"}}
        />
        </div>
    );
}