import { useEffect, useState, useRef, useCallback } from "react";

const useWebSocket = (url: string) => {
  const [socket, setSocket] = useState<WebSocket | null>(null);
  const [messages, setMessages] = useState<string[]>([]);
  const [audioContext, setAudioContext] = useState<AudioContext | null>(null);
  const [isStreaming, setIsStreaming] = useState(false);
  const audioQueue = useRef<Float32Array[]>([]); // Persist audio queue without re-rendering

  const startStreaming = useCallback(() => {
    if (!audioContext) {
      const newAudioContext = new (window.AudioContext || (window as any).webkitAudioContext)({
        sampleRate: 24000, // Match WebSocket audio sample rate
      });
      setAudioContext(newAudioContext);
    }
    setIsStreaming(true);
  }, [audioContext]);

  const playAudio = useCallback((chunk: Float32Array) => {
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
  }, [audioContext]);

  useEffect(() => {
    console.log("Running use effect");
    if (!audioContext || !isStreaming) return;

    const ws = new WebSocket(url);

    ws.onopen = () => console.log("Connected to WebSocket");

    ws.onmessage = async (event) => {
      const parsedData = JSON.parse(event.data);

      if (parsedData.type === "response.open" || parsedData.type === "response.transcript") {
        setMessages((prev) => [...prev, parsedData.message]);
      }

      if (parsedData.type === "response.audio.chunk") {
        console.log("Audio chunk received");

        try {
          // Decode base64 PCM16 audio data
          const base64String = parsedData.delta;
          const binaryData = Uint8Array.from(atob(base64String), (c) => c.charCodeAt(0));

          // Convert PCM16 to Float32 properly
          const float32Array = new Float32Array(binaryData.length / 2);
          for (let i = 0; i < binaryData.length; i += 2) {
            let sample = (binaryData[i] | (binaryData[i + 1] << 8)); // Little-endian PCM16
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

  const sendMessage = useCallback((message: string) => {
    if (socket && socket.readyState === WebSocket.OPEN) {
      socket.send(message);
    }
  }, [socket]);

  return { messages, sendMessage, startStreaming };
};

export default useWebSocket;
