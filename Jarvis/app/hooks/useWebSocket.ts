import { useEffect, useState, useRef, useCallback } from "react";

const useWebSocket = (url: string) => {
  const [socket, setSocket] = useState<WebSocket | null>(null);
  const [messages, setMessages] = useState<string[]>([]);
  const [audioContext, setAudioContext] = useState<AudioContext | null>(null);
  const [isStreaming, setIsStreaming] = useState(false);
  const audioQueue = useRef<Float32Array[]>([]); // Persist audio queue without re-rendering
  const [isRecording, setIsRecording] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioStreamRef = useRef<MediaStream | null>(null);


  const startStreaming = useCallback(() => {
    if (!audioContext) {
      const newAudioContext = new (window.AudioContext ||
        (window as any).webkitAudioContext)({
        sampleRate: 24000, // Match WebSocket audio sample rate
      });
      setAudioContext(newAudioContext);
    }
    setIsStreaming(true);
  }, [audioContext]);

  const sendMessage = useCallback(
    (message: string) => {
      if (socket && socket.readyState === WebSocket.OPEN) {
        // the following event will get split into conversation event and response event, 
        // response event gives guidlines to how the rospnse should be as well as requests a response:
        const clientEvent = {
          response: {
            instructions: message,
          },
        };
          console.log("clientEvent: ", clientEvent);
          socket.send(JSON.stringify(clientEvent));
      }
    },
    [socket]
  );

  const startRecording = async () => {
    console.log("Start Recording");
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    // log mic name
    audioStreamRef.current = stream;

    const mediaRecorder = new MediaRecorder(stream, {
      mimeType: "audio/webm;codecs=pcm",
    });
    mediaRecorderRef.current = mediaRecorder;

    mediaRecorder.ondataavailable = (event) => {
      sendAudioChunk(event.data);
    };
  // Send audio every 150ms
    mediaRecorder.start(1000);
    setIsRecording(true);
  };

  const stopRecording = () => {
    console.log("Stop Recording");
    mediaRecorderRef.current?.stop();
    audioStreamRef.current?.getTracks().forEach((track) => track.stop());
    // setIsRecording(false);
    // const clientEvent = {
    //   type: "input_audio_buffer.commit"
    // };
    // socket?.send(JSON.stringify(clientEvent));
  };

  const playAudio = useCallback(
    (chunk: Float32Array) => {
      if (!audioContext) return;

      // Create an AudioBuffer for the chunk
      const audioBuffer = audioContext.createBuffer(1, chunk.length, 24000);
      audioBuffer.copyToChannel(chunk, 0);

      // Ensure AudioContext is running
      if (audioContext.state === "suspended") {
        audioContext.resume();
      }

      // Play the audio and schedule the next chunk when the current one finishes
      const source = audioContext.createBufferSource();
      source.buffer = audioBuffer;
      source.connect(audioContext.destination);

      // After the current chunk finishes, play the next one in the queue
      source.onended = () => {
        audioQueue.current.shift(); // Remove the played chunk from the queue
        if (audioQueue.current.length > 0) {
          playAudio(audioQueue.current[0]); // Play next chunk in queue
        }
      };

      source.start();
    },
    [audioContext]
  );

  ////////////////////Connect to websocket and handle incoming messages/////////////////////
  useEffect(() => {
    console.log("Running use effect");
    if (!audioContext || !isStreaming) return;

    const ws = new WebSocket(url);

    ws.onopen = () => console.log("Connected to WebSocket");

    ws.onmessage = async (event) => {
      const parsedData = JSON.parse(event.data);

      if (
        parsedData.type === "response.open" ||
        parsedData.type === "response.transcript"
      ) {
        setMessages((prev) => [...prev, parsedData.message]);
      }

      if (parsedData.type === "response.audio.chunk") {
        console.log("Audio chunk received");

        try {
          // Decode base64 PCM16 audio data from the WebSocket message
          const base64String = parsedData.delta;
          const binaryData = Uint8Array.from(atob(base64String), (c) =>
            c.charCodeAt(0)
          );

          // Convert PCM16 to Float32 properly
          const float32Array = new Float32Array(binaryData.length / 2);
          for (let i = 0; i < binaryData.length; i += 2) {
            let sample = binaryData[i] | (binaryData[i + 1] << 8); // Little-endian PCM16
            if (sample >= 32768) sample -= 65536; // Convert unsigned to signed
            float32Array[i / 2] = sample / 32768.0; // Normalize between -1.0 and 1.0
          }

          // Add the chunk to the audio queue
          audioQueue.current.push(float32Array);

          // If this is the first chunk or if audio is not already playing, start playing
          if (audioQueue.current.length === 1) {
            playAudio(float32Array);
          }
        } catch (error) {
          console.error("Error decoding audio chunk:", error);
        }
      }
    };

    ws.onclose = () => {
      console.log("WebSocket disconnected");
    };

    ws.onerror = (error) => {
      console.error("WebSocket error:", error);
    };

    setSocket(ws);

    return () => {
      ws.close();
      if (audioContext && audioContext.state !== "closed") {
        audioContext.close();
      }
    };
  }, [url, audioContext, isStreaming, playAudio]);

  ////////////////////////////////////////////////////////////////////////////////
  ////////////////////// the following section processes and  ////////////////////
  ////////////////////// sends base64encoded pcm16 data to ws ////////////////////
  ////////////////////////////////////////////////////////////////////////////////

  // Converts Float32Array of audio data to PCM16 ArrayBuffer
  function floatTo16BitPCM(float32Array: Float32Array): ArrayBuffer {
    const buffer = new ArrayBuffer(float32Array.length * 2);
    const view = new DataView(buffer);
    let offset = 0;
    for (let i = 0; i < float32Array.length; i++, offset += 2) {
      let s = Math.max(-1, Math.min(1, float32Array[i]));
      view.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7fff, true);
    }
    return buffer;
  }

  // Converts a Float32Array to base64-encoded PCM16 data
  function base64EncodeAudio(float32Array: Float32Array): string {
    const arrayBuffer = floatTo16BitPCM(float32Array);
    console.log("arrayBuffer: ", arrayBuffer);
    let binary = "";
    let bytes = new Uint8Array(arrayBuffer);
    const chunkSize = 0x8000; // 32KB chunk size
    for (let i = 0; i < bytes.length; i += chunkSize) {
      let chunk = bytes.subarray(i, i + chunkSize);
      binary += String.fromCharCode.apply(null, Array.from(chunk));
    }
    return btoa(binary);
  }

  // Converts and sends blob as Float32Array of audio data to the base64encoded function
const sendAudioChunk = function (blob: Blob) {
  const reader = new FileReader();
  reader.onload = function () {
    const buffer = reader.result as ArrayBuffer;
    const remainder = buffer.byteLength % 4;

    // If not a multiple of 4, trim the buffer to the nearest multiple of 4
    const paddedBuffer = remainder === 0 ? buffer : buffer.slice(0, buffer.byteLength - remainder);

    // Create a Float32Array from the padded buffer
    const audioData = new Float32Array(paddedBuffer);
    console.log("audioData: ", audioData);
    const base64Data = base64EncodeAudio(audioData);
    console.log("base64Data: ", base64Data);
    
    if (socket && socket.readyState === WebSocket.OPEN) {
      const clientEvent = {
        type: "input_audio_buffer.append",
        audio: base64Data,
      };
      socket.send(JSON.stringify(clientEvent));
    }
  };
  reader.readAsArrayBuffer(blob);
};


  return {
    messages,
    startRecording,
    stopRecording,
    sendMessage,
    startStreaming,
  };
};

export default useWebSocket;
