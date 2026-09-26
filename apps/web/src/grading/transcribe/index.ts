// PRD F10 — Say-It Practice: transcribe — two-week scope only. Gemini audio
// transcription; the transcript fills the Explain text area so the student
// can check it before submitting. Calls the proxy's /v1/transcribe route
// directly (not through grading/ai's generate(), since audio needs a
// different request shape than the JSON-input prompts) with the same
// timeout discipline as every other AI call.

import { config as webConfig } from "../../config";
import { AI_TIMEOUT_MS, MAX_AUDIO_BYTES, MAX_AUDIO_DURATION_SEC } from "../config";
import { GradingError } from "../errors";

const ACCEPTED_MIME_TYPES = ["audio/webm", "audio/wav", "audio/mp4", "audio/mpeg", "audio/ogg"];

/**
 * Estimates a rough upper bound on duration from size alone (no decode
 * available outside a real audio pipeline); used only to reject grossly
 * oversized clips early, not as an exact duration check.
 */
function estimatedMaxDurationSec(bytes: number): number {
  const ASSUMED_MIN_BITRATE_BPS = 16_000; // conservative floor for compressed speech audio
  return (bytes * 8) / ASSUMED_MIN_BITRATE_BPS;
}

function validateAudio(audio: Blob): void {
  if (webConfig.scope !== "two-week") {
    throw new GradingError("INVALID_STEP", "Say-It Practice (audio transcription) is only available in two-week scope.");
  }
  if (audio.size === 0) {
    throw new GradingError("INVALID_STEP", "The recording is empty.");
  }
  if (audio.size > MAX_AUDIO_BYTES) {
    throw new GradingError("INVALID_STEP", `The recording is too large (max ${Math.floor(MAX_AUDIO_BYTES / (1024 * 1024))}MB).`);
  }
  if (audio.type && !ACCEPTED_MIME_TYPES.includes(audio.type)) {
    throw new GradingError("INVALID_STEP", `Unsupported audio format: ${audio.type}.`);
  }
  if (estimatedMaxDurationSec(audio.size) > MAX_AUDIO_DURATION_SEC * 4) {
    // A generous multiple of the duration cap, since size-based estimation is
    // approximate — this only catches clips wildly over the limit.
    throw new GradingError("INVALID_STEP", `The recording is too long (max ${MAX_AUDIO_DURATION_SEC / 60} minutes).`);
  }
}

async function blobToBase64(blob: Blob): Promise<string> {
  const buffer = await blob.arrayBuffer();
  const bytes = new Uint8Array(buffer);
  let binary = "";
  const CHUNK = 0x8000;
  for (let i = 0; i < bytes.length; i += CHUNK) {
    binary += String.fromCharCode(...bytes.subarray(i, i + CHUNK));
  }
  return btoa(binary);
}

export async function transcribe(audio: Blob): Promise<{ text: string }> {
  validateAudio(audio);

  const audioBase64 = await blobToBase64(audio);
  const controller = new AbortController();
  const timeout = setTimeout(() => {
    controller.abort();
  }, AI_TIMEOUT_MS);
  try {
    const response = await fetch(`${webConfig.aiProxyUrl}/v1/transcribe`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ audioBase64, mimeType: audio.type || "audio/webm" }),
      signal: controller.signal,
    });
    if (!response.ok) {
      throw new GradingError("GEMINI_FAILED", `Transcription failed (proxy responded ${response.status}).`);
    }
    const json = (await response.json()) as { text?: string };
    if (typeof json.text !== "string") {
      throw new GradingError("GEMINI_BAD_JSON", "Transcription response was malformed.");
    }
    return { text: json.text };
  } catch (e) {
    if (e instanceof GradingError) throw e;
    throw new GradingError("GEMINI_FAILED", e instanceof Error ? e.message : "Transcription failed.");
  } finally {
    clearTimeout(timeout);
  }
}
