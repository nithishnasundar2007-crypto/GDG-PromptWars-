// PRD F10 — Say-It Practice: transcribe — two-week scope only. Gemini audio
// transcription; the transcript fills the Explain text area so the student
// can check it before submitting. Real Gemini audio-understanding call is
// still Task 8 / M1 work (see docs/BACKEND1_REPORT.md) — this validates
// scope gating and input limits up front (hard rules §3.2), which must hold
// regardless of whether the network call itself is wired up yet.

import { config } from "../../config";
import { MAX_AUDIO_BYTES, MAX_AUDIO_DURATION_SEC } from "../config";
import { GradingError } from "../errors";
import { NotImplementedError } from "../../lib/notImplemented";

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
  if (config.scope !== "two-week") {
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

export async function transcribe(audio: Blob): Promise<{ text: string }> {
  validateAudio(audio);
  throw new NotImplementedError("transcribe", "Suchit", "M1 (two-week scope, Gemini call)");
}
