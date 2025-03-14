// ws connection to openAI api
import WebSocket from "ws";
import fs from "fs";
import { spawn } from "child_process";

const url =
  "wss://api.openai.com/v1/realtime?model=gpt-4o-realtime-preview-2024-12-17";

const ws = new WebSocket(url, {
  headers: {
    Authorization: "Bearer " + process.env.OPENAI_API_KEY,
    "OpenAI-Beta": "realtime=v1",
  },
});

ws.on("open", function open() {
  console.log("Connected to server.");
  const event = {
    type: "response.create",
    response: {
      modalities: ["audio", "text"],
      instructions: "Give me a haiku about code.",
    },
  };
  ws.send(JSON.stringify(event));
});

let combinedAudioData = "";

ws.on("message", function incoming(message) {
  const serverEvent = JSON.parse(message);
  if (serverEvent.type === "response.audio.delta") {
    combinedAudioData += serverEvent.delta;
  }
  if (serverEvent.type === "response.done") {
    console.log("Compiled audio response.");


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
  }
});
