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
    type: "session.update",
    session: {
      voice: "verse",
      // echo is decent too
    },
  };
  wsOpenAI.send(JSON.stringify(event));
});
wsOpenAI.on("message", function incoming(message) {
  const serverEvent = JSON.parse(message);
  console.log("Received message from OpenAI: ", serverEvent);
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
  }
  if (serverEvent.type === "response.audio_transcript.done") {
    console.log("Transcript: ", serverEvent.transcript);
    wsClient.clients.forEach((client) => {
      const wsClientEvent = {
        type: "response.transcript",
        message: serverEvent.transcript,
      };
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
    wsOpenAI.send(JSON.stringify(parsedEvent));
  });

  ws.on("close", () => {
    console.log("Client disconnected");
  });

  ws.on("error", (error) => {
    console.error("WebSocket error:", error);
  });
});
