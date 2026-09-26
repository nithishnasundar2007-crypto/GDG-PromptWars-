// Owner: Suchit. transcribe — two-week scope only (PRD F10, Say-It Practice).
// Gemini audio transcription; the transcript fills the Explain text area so
// the student can check it before submitting.

import { NotImplementedError } from "../../lib/notImplemented";

export async function transcribe(_audio: Blob): Promise<{ text: string }> {
  throw new NotImplementedError("transcribe", "Suchit", "M1 (two-week scope)");
}
