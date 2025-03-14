import { useState } from "react";
import useWebSocket from "~/hooks/useWebSocket";

export function OrbSocket() {
    // here we will connect to websocket on ws:://localhost:8080
    const { messages, sendMessage} = useWebSocket("ws://localhost:8080");
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
        <button style={{marginLeft: "10px", cursor: "pointer"}} onClick={handleSendMessage}>Send Message</button>
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