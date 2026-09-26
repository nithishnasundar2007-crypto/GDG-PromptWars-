// PRD §8.5 (Risks) / hard rule §3.2 — App Check token verification. Real
// enforcement needs a live Firebase project and service-account credentials
// that this sandbox does not have (docs/SECURITY.md is explicit about this).
// `config.appCheckDevBypass` defaults to bypass-ON only outside
// NODE_ENV=production, so a real deployment is protected by default without
// anyone having to remember to flip a flag; setting it to "false" explicitly
// (or just running with NODE_ENV=production) switches to the real
// firebase-admin App Check verification API, so the code path exists and is
// unit-testable via `verifyAppCheckToken`'s injectable `verifier` parameter,
// even though it cannot be exercised end-to-end here.

import { config } from "./config.js";

export type AppCheckVerifierFn = (token: string) => Promise<boolean>;

let cachedVerifier: AppCheckVerifierFn | undefined;
let hasWarnedAboutBypass = false;

async function realFirebaseVerifier(token: string): Promise<boolean> {
  // Lazily imported so a dev-bypass deployment never needs firebase-admin's
  // credentials configured at all.
  const { initializeApp, getApps } = await import("firebase-admin/app");
  const { getAppCheck } = await import("firebase-admin/app-check");
  if (getApps().length === 0) {
    initializeApp(config.firebaseProjectId ? { projectId: config.firebaseProjectId } : {});
  }
  try {
    await getAppCheck().verifyToken(token);
    return true;
  } catch {
    return false;
  }
}

/**
 * Verifies an App Check token from the `X-Firebase-AppCheck` header. In dev
 * bypass mode (the sandbox/local default), always returns true after logging
 * a warning once, so the check is visibly disabled rather than silently
 * absent. `verifier` is injectable for tests.
 */
export async function verifyAppCheckToken(token: string | undefined, verifier: AppCheckVerifierFn = cachedVerifier ?? realFirebaseVerifier): Promise<boolean> {
  if (config.appCheckDevBypass) {
    if (!hasWarnedAboutBypass) {
      hasWarnedAboutBypass = true;
      // eslint-disable-next-line no-console -- a one-time, visible warning that a security check is off, not a data log.
      console.warn("[ai-proxy] APP_CHECK_DEV_BYPASS is on: every request is accepted without an App Check token.");
    }
    return true;
  }
  if (!token) return false;
  return verifier(token);
}

/** Test-only: overrides the real verifier so tests never touch firebase-admin. */
export function setAppCheckVerifierForTests(verifier: AppCheckVerifierFn | undefined): void {
  cachedVerifier = verifier;
}
