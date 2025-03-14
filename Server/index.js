// ws connection to openAI api
import WebSocket, { WebSocketServer } from "ws";
import fs from "fs";
import { spawn } from "child_process";

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
    type: "response.create",
    response: {
      modalities: ["audio", "text"],
      instructions: "Give me a haiku about code.",
    },
  };
  wsOpenAI.send(JSON.stringify(event));
});


let combinedAudioData = "";

wsOpenAI.on("message", function incoming(message) {
  const serverEvent = JSON.parse(message);
  if (serverEvent.type === "response.audio.delta") {
    combinedAudioData += serverEvent.delta;
  }
  if (serverEvent.type === "response.done") {
    // console.log("Compiled audio response.");

    const audioBuffer = Buffer.from(combinedAudioData, "base64");
    fs.writeFileSync("output.pcm", audioBuffer);
    // convert to wav
    const ffmpeg = spawn("ffmpeg", [
      "-f",
      "s16le",
      "-ar",
      "24000",
      "-ac",
      "1",
      "-i",
      "output.pcm",
      "output.wav",
    ]);
  }
  if (serverEvent.type === "response.audio_transcript.done") {
    console.log("Transcript: ", serverEvent.transcript);
    wsClient.clients.forEach((client) => {
      client.send(serverEvent.transcript);
    });
  }
});

///////////// WEBSOCKET FOR CONNECTING TO CLIENT //////////////

const wsClient = new WebSocketServer({ port: 8080 });
wsClient.on("connection", function connection(ws) {
  // add code below for what runs on connection
  console.log("Connected to client.");
  ws.send("Hello from server!");  
  // use ws.send to send data to client

  ws.on("message", function incoming(message) {
    // here we run code when we get a message from client
    // convert to string
    // const event = JSON.parse(message);
    // convert to string
    const event = {
      type: "response.create",
      response: {
        modalities: ["audio", "text"],
        instructions: message.toString(),
      },
    };
    console.log(event.response.instructions);
    wsOpenAI.send(JSON.stringify(event));
    // console.log("Sent message to OpenAI.");
  });

  ws.on("close", () => {
    console.log("Client disconnected");
  });

  ws.on("error", (error) => {
    console.error("WebSocket error:", error);
  });
  // running on ws://localhost:8080
});
