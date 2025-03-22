// ws connection to openAI api
import WebSocket, { WebSocketServer } from "ws";
import fs from "fs";
import { spawn } from "child_process";
import { parse } from "path";

///////////// WEBSOCKET FOR CONNECTING TO OPENAI API //////////////
///////////// WEBSOCKET FOR CONNECTING TO OPENAI API //////////////
///////////// WEBSOCKET FOR CONNECTING TO OPENAI API //////////////
const url =
  "wss://api.openai.com/v1/realtime?model=gpt-4o-realtime-preview-2024-12-17";
const wsOpenAI = new WebSocket(url, {
  headers: {
    Authorization: "Bearer " + process.env.OPENAI_API_KEY,
    "OpenAI-Beta": "realtime=v1",
  },
});

wsOpenAI.on("open", function open() {
  console.log("Connected to OpenAI Websocket.");
  const event = {
    "type": "session.update",
    "session": {
      "voice": "echo",
    },
  };
  wsOpenAI.send(JSON.stringify(event));
});
wsOpenAI.on("message", function incoming(message) {
  const serverEvent = JSON.parse(message);
  console.log("Received message from OpenAI: ", serverEvent);
  if (serverEvent.type === "error") {
    console.log(serverEvent);
  }
  if (serverEvent.type === "response.audio.delta") {
    const audioEvent = {
      type: "response.audio.chunk",
      delta: serverEvent.delta,
    };
    wsClient.clients.forEach((client) => {
      client.send(JSON.stringify(audioEvent));
    });
    console.log("Recieved audio chunk.");
  }
  if (serverEvent.type === "response.done") {
    console.log("Response done.");
    console.log(serverEvent.response.status_details);
  }
  if (serverEvent.type === "response.audio_transcript.done") {
    console.log("Transcript: ", serverEvent.transcript);
    wsClient.clients.forEach((client) => {
      const wsClientEvent = {
        type: "response.transcript",
        message: serverEvent.transcript,
      };
      console.log("server transcript: ", serverEvent.transcript);
      const conversationEventOpenAi = {
        "type": "conversation.item.create",
        "previous_item_id": null,
        "item": {
          "type": "message",
          "role": "assistant",
          "content":[
            {
              "type": "text",
              "text": serverEvent.transcript
            }
          ]
        },
      }  
      wsOpenAI.send(JSON.stringify(conversationEventOpenAi));
      client.send(JSON.stringify(wsClientEvent));
    });
  }
});
wsOpenAI.on("close", function close() {
  console.log("Open AI Websocket disconnected.");
}
);
wsOpenAI.on("error", function error(err) {
  console.error("OpenAI Websocket error: ", err);
}
);



///////////// WEBSOCKET FOR CONNECTING TO CLIENT //////////////
///////////// WEBSOCKET FOR CONNECTING TO CLIENT //////////////
///////////// WEBSOCKET FOR CONNECTING TO CLIENT //////////////
const wsClient = new WebSocketServer({ port: 8083 });
wsClient.on("connection", function connection(ws) {
  console.log("Connected to client.");
  const wsClientEvent = {
    type: "response.open",
    message: "Hello! Connected to server.",
  };
  ws.send(JSON.stringify(wsClientEvent));

  ws.on("message", function incoming(clientEvent) {
    const parsedEvent = JSON.parse(clientEvent);
    console.log("Received Event from client: ", parsedEvent.type);
    console.log("Sending event to OpenAI: ", parsedEvent);
    // save conversation item
    // conversation.item.create event send a new message to the socket
    const conversationEvent = {
      "type": "conversation.item.create",
      "previous_item_id": null,
      "item": {
        "type": "message",
        "role": "user",
        "content":[
          {
            "type": "input_text",
            "text": parsedEvent.response.instructions
          }
        ]
      },
    }        
    wsOpenAI.send(JSON.stringify(conversationEvent));

    // response create asks for response with other instructions
    const createResponseEvent = {
    "type": "response.create",
    "response": {
        "modalities": ["text", "audio"],
        "instructions": "You are Jarvis, a virtual assistant who helps konrad with daily tasks. Speak with a dry sense of humor and a heavy english accent. refer to konrad as sir a lot. Keep the responses short and get straight to the point.",
      }
    }
    wsOpenAI.send(JSON.stringify(createResponseEvent));
  });

  ws.on("close", () => {
    console.log("Client disconnected");
  });

  ws.on("error", (error) => {
    console.error("WebSocket error:", error);
  });
});
