// @ts-nocheck
import React, { useState, useRef } from "react";

export default function Jarvis() {
  const [listening, setListening] = useState(false);
  const [response, setResponse] = useState("Hold the button and talk to Jarvis.");
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);

  async function startRecording() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaRecorderRef.current = new MediaRecorder(stream);

      audioChunksRef.current = [];

      mediaRecorderRef.current.ondataavailable = (e) => {
        audioChunksRef.current.push(e.data);
      };

      mediaRecorderRef.current.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: "audio/webm" });

        // Convert blob → raw bytes
        const arrayBuffer = await audioBlob.arrayBuffer();

        // Send raw audio to backend
        const res = await fetch("/api/Jarvis", {
          method: "POST",
          headers: {
            "Content-Type": "audio/webm",
          },
          body: arrayBuffer,
        });

        if (!res.ok) {
          setResponse("Jarvis had an error responding.");
          return;
        }

        const data = await res.json();
        setResponse(data.text || "Jarvis responded, but no text returned.");

        // Play Jarvis voice
        if (data.audio) {
          const audio = new Audio(`data:audio/mpeg;base64,${data.audio}`);
          audio.play();
        }
      };

      mediaRecorderRef.current.start();
      setListening(true);
    } catch (err) {
      // error surfaced to UI via setResponse below
      setResponse("Microphone access failed. Check browser permissions.");
    }
  }

  function stopRecording() {
    if (mediaRecorderRef.current) {
      mediaRecorderRef.current.stop();
      mediaRecorderRef.current.stream.getTracks().forEach((t) => t.stop());
    }
    setListening(false);
  }

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#050816",
        color: "white",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: 20,
        fontFamily: "system-ui, -apple-system, sans-serif",
      }}
    >
      <h1 style={{ fontSize: 32, marginBottom: 12 }}>JARVIS</h1>

      <p
        style={{
          maxWidth: 320,
          textAlign: "center",
          fontSize: 15,
          opacity: 0.8,
          marginBottom: 30,
        }}
      >
        Hold the button, speak, and Jarvis will talk back.
      </p>

      <button
        onMouseDown={startRecording}
        onMouseUp={stopRecording}
        onTouchStart={startRecording}
        onTouchEnd={stopRecording}
        style={{
          width: 150,
          height: 150,
          borderRadius: "50%",
          border: "none",
          background: listening ? "#ff3b30" : "#0a84ff",
          color: "white",
          fontSize: 18,
          fontWeight: "600",
          boxShadow: listening
            ? "0 0 30px rgba(255,59,48,0.7)"
            : "0 0 30px rgba(10,132,255,0.7)",
        }}
      >
        {listening ? "Listening..." : "Hold to Talk"}
      </button>

      <div
        style={{
          marginTop: 30,
          maxWidth: 340,
          padding: 16,
          background: "rgba(255,255,255,0.05)",
          borderRadius: 12,
          fontSize: 14,
          textAlign: "left",
          wordWrap: "break-word",
        }}
      >
        {response}
      </div>
    </div>
  );
}
