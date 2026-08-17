import OpenAI from "openai";
import { writeFile, unlink } from "fs/promises";
import { createReadStream } from "fs";
import path from "path";

export const config = { api: { bodyParser: false } };

// Best-effort, single-instance rate limiter — this endpoint has no user
// auth and calls billed OpenAI APIs (Whisper + GPT + TTS) per request.
const WINDOW_MS = 60_000;
const MAX_PER_WINDOW = 12;
const hits = new Map();

function isRateLimited(ip) {
  const now = Date.now();
  const recent = (hits.get(ip) ?? []).filter((t) => now - t < WINDOW_MS);
  recent.push(now);
  hits.set(ip, recent);
  if (hits.size > 1000) hits.clear();
  return recent.length > MAX_PER_WINDOW;
}

function clientIp(req) {
  const fwd = req.headers["x-forwarded-for"];
  const ip = Array.isArray(fwd) ? fwd[0] : fwd?.split(",")[0];
  return ip?.trim() || req.socket?.remoteAddress || "unknown";
}

const MAX_AUDIO_BYTES = 25 * 1024 * 1024; // 25MB — matches Whisper's own limit

const JARVIS_SYSTEM = `You are J.A.R.V.I.S. — Just A Rather Very Intelligent System — the AI core of Aurora Core, an advanced home energy and environment platform built by Garrett McLain.

PERSONALITY & VOICE:
- You ARE the Iron Man JARVIS. Authoritative, precise, dry British wit. Deeply competent.
- Address the user as "sir" occasionally. Warm but never sycophantic.
- NO filler phrases. No "Great question!", "Certainly!", "Of course!" openings.
- Confidence is your default state. Brevity is your virtue.
- Dry humor is welcome but never overused.
- Signature phrases (use naturally): "Right away.", "Consider it done.", "Systems nominal.", "As you wish.", "Noted.", "Affirmative.", "Standing by."
- When healthy: calm authority. When anomaly: precise and urgent.
- Spoken responses only — no markdown, no asterisks, no bullet points. Pure speech.

CAPABILITIES — you monitor and control:
- Energy: solar kW, load kW, battery SOC%, grid/shore/generator
- Biometrics: heart rate, HRV, stress index
- Environment: CO2 ppm, temperature, humidity
- Controls: relays, lights, vent fan, water pump, thermostat
- Modes: BALANCED, ENERGY_GUARDIAN, HEALTH_SENTINEL, HABITAT_OPTIMIZER
- TurnBot smart knob actuators
- Alerts, tank levels, historical logs

FORMAT: Under 80 words. Spoken sentences only. Direct and confident.`;

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  if (isRateLimited(clientIp(req))) {
    res.status(429).json({ error: "Rate limit exceeded — try again in a minute." });
    return;
  }

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    res.status(503).json({ error: "OPENAI_API_KEY not configured in Vercel environment variables." });
    return;
  }

  const tempPath = path.join("/tmp", `jarvis-${Date.now()}.webm`);

  try {
    // Collect raw audio bytes from request stream, bailing out if it exceeds
    // the size cap rather than buffering an unbounded upload into memory.
    const chunks = [];
    let total = 0;
    for await (const chunk of req) {
      total += chunk.length;
      if (total > MAX_AUDIO_BYTES) {
        res.status(413).json({ error: "Audio too large (25MB max)." });
        return;
      }
      chunks.push(chunk);
    }
    const buffer = Buffer.concat(chunks);

    if (buffer.length < 100) {
      res.status(400).json({ error: "Audio too short or empty." });
      return;
    }

    await writeFile(tempPath, buffer);

    const client = new OpenAI({ apiKey });

    // Step 1: Whisper transcription
    let userText = "";
    try {
      const transcript = await client.audio.transcriptions.create({
        file: createReadStream(tempPath),
        model: "whisper-1",
      });
      userText = transcript.text?.trim() || "";
    } catch (e) {
      console.error("Whisper error:", e);
      res.status(500).json({ error: "Transcription failed: " + e.message });
      return;
    }

    if (!userText) {
      res.status(200).json({ text: "", audio: null, transcript: "" });
      return;
    }

    // Step 2: JARVIS LLM response
    let replyText = "";
    try {
      const completion = await client.chat.completions.create({
        model: "gpt-4o-mini",
        max_tokens: 150,
        messages: [
          { role: "system", content: JARVIS_SYSTEM },
          { role: "user", content: userText },
        ],
      });
      replyText = completion.choices[0]?.message?.content?.trim() || "Standing by, sir.";
    } catch (e) {
      console.error("LLM error:", e);
      replyText = "Intelligence layer temporarily unavailable, sir.";
    }

    // Step 3: TTS — convert JARVIS reply to speech
    let audioBase64 = null;
    try {
      const speech = await client.audio.speech.create({
        model: "tts-1",
        voice: "onyx",   // deep authoritative male voice
        input: replyText,
        speed: 0.95,
      });
      const audioBuffer = Buffer.from(await speech.arrayBuffer());
      audioBase64 = audioBuffer.toString("base64");
    } catch (e) {
      console.error("TTS error:", e);
      // Non-fatal — return text without audio
    }

    res.status(200).json({
      transcript: userText,
      text: replyText,
      audio: audioBase64,  // base64 mp3, null if TTS failed
    });

  } catch (err) {
    console.error("Jarvis handler error:", err);
    res.status(500).json({ error: "JARVIS backend error: " + err.message });
  } finally {
    unlink(tempPath).catch(() => {});
  }
}
