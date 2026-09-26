// PRD §7.5 — the one place GEMINI_API_KEY exists (docs/PHASE0_AUDIT.md
// sections I/J). Process entrypoint only: builds the app (app.ts) and binds
// a port. Kept separate from app.ts so tests can exercise the app directly.

import { createApp } from "./app.js";
import { config, CONTRACT_VERSION } from "./config.js";

createApp().listen(config.port, () => {
  // eslint-disable-next-line no-console -- startup banner, not a data log
  console.log(`ai-proxy listening on :${config.port} (contract ${CONTRACT_VERSION})`);
});
