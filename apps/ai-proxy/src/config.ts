// The Gemini key lives ONLY here — nowhere in apps/web. See
// docs/PHASE0_AUDIT.md sections I (conflict 1) and J.
function required(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`Missing required env var: ${name}`);
  return value;
}

export const config = {
  geminiApiKey: required("GEMINI_API_KEY"),
  geminiModel: process.env.GEMINI_MODEL ?? "gemini-2.0-flash",
  allowedOrigin: process.env.ALLOWED_ORIGIN ?? "http://localhost:5173",
  port: Number(process.env.PORT ?? 8787),
};

// Keep in sync with apps/web/src/contracts/types.ts CONTRACT_VERSION.
// Duplicated (not imported) because ai-proxy is a separate deployable
// package from apps/web — a contract test in apps/web asserts they match
// (docs/PHASE0_AUDIT.md section N).
export const CONTRACT_VERSION = "1.0.0";
