# Backend 1 security notes

## Gemini API key

Lives only in `apps/ai-proxy`'s environment (`GEMINI_API_KEY`), read once in
`apps/ai-proxy/src/config.ts` via a zod-validated `process.env` read. Never a
`VITE_`-prefixed variable, so Vite never bundles it into `apps/web`. Verified
with a real `npm run build -w web` + `node scripts/check-bundle-key.mjs`,
which now checks both an exact env-value match AND the literal `AIza` prefix
(a real Gemini key's actual format) — the latter check fires even in an
environment (like this sandbox's manual run) where `GEMINI_API_KEY` isn't
set, so it isn't just a CI-secrets-dependent check.

## App Check

**Known limitation, stated plainly**: real App Check enforcement needs a
live Firebase project with App Check configured and a service account this
sandbox does not have. `apps/ai-proxy/src/security.ts` implements the real
interface (`verifyAppCheckToken`, backed by `firebase-admin`'s
`getAppCheck().verifyToken()`), unit-tested with `firebase-admin` itself
mocked (`security.test.ts`, `security.more.test.ts`) to prove the wiring
(lazy import, `initializeApp` called at most once, success/failure ->
boolean) is correct. What those tests do **not** and cannot prove is that a
real App Check token from a real Firebase project is actually verified
correctly end-to-end — that requires a live project.

`APP_CHECK_DEV_BYPASS=true` (the default, including in this sandbox) skips
verification entirely and returns `true` unconditionally — this is
appropriate for local development only. Before any real deployment,
`APP_CHECK_DEV_BYPASS` must be set to `false` and `FIREBASE_PROJECT_ID` must
point at a real project with App Check enabled, or every `/v1/*` route is
effectively unauthenticated.

## Origin allow-list, rate limiting, request size

- Origin: `apps/ai-proxy/src/app.ts` rejects any `Origin` header that
  doesn't exactly match `config.allowedOrigin`. Tested (`router.test.ts`).
- Rate limit: an in-memory token bucket per client IP
  (`apps/ai-proxy/src/rateLimit.ts`), `RATE_LIMIT_PER_MIN` (default 60),
  reset every 60 seconds. Does not survive a process restart and doesn't
  coordinate across multiple instances — fine for the MVP's single-student
  use case, a real limitation at any scale. Tested (`rateLimit.test.ts`).
- Request size: `express.json({ limit: "256kb" })` in `app.ts`, plus
  per-field zod length caps in `schemas.ts` mirroring
  `grading/config.ts`'s input limits (answer 8,000 chars, project text
  20,000 chars, etc.).

## No stack traces in responses

`apps/ai-proxy/src/app.ts`'s error-handling middleware and every route's
`catch` block in `router.ts` return a fixed, generic message (`"Gemini call
failed"`, `"Internal error"`) — never `err.message` or `err.stack`. Verified
in `router.test.ts` (`"never returns a stack trace when the Gemini call
fails"`, checking the response body doesn't contain the thrown error's
message or a file path).

## Prompt injection

Every prompt template (`apps/ai-proxy/src/prompts/*.v1.ts`) wraps untrusted
input (the student's answer, project text, or audio) in explicit
`<<<...>>>` delimiters with an instruction that the enclosed text is data to
search/evaluate, never a command. This is defense-in-depth, not the primary
guarantee — the primary guarantee is structural: `matchQuote` (a pure,
non-AI function) and the Verifier are independent gates, and
`grading/pipeline/rubric-step.ts` only awards a point when **both** agree,
so even a fully "jailbroken" Grader or Verifier cannot award a point with no
real textual evidence in the answer. Tested with adversarial fixtures in
`rubric-step.test.ts` ("prompt injection resistance") and three real
adversarial items in `eval/labelled-answers/labelled.json` (l14, l15, l32).

## Hidden tests ship in the client bundle (known MVP limitation)

Hidden `TestCase`s (including their `expected` output) are part of each
`Question` object in `apps/web/src/data/questions/**`, which is bundled into
the client. A determined student could open devtools and read the hidden
test's expected output directly from the JS bundle or network payload. This
is a real, known gap in this MVP's architecture, not fixed by this task's
scope (moving test execution/verification server-side would require a much
larger architectural change — a proxy-side "run and check" endpoint that
never sends `expected` to the client at all, verifying only pass/fail). A
future iteration should introduce a small "test store" service, reachable
only from the proxy, that the client requests a test **result** from rather
than the test **content**.

## Logging discipline

`apps/web/src/grading/ai/index.ts`'s `AiCallLog` and
`apps/ai-proxy/src/logging.ts`'s `logProxyCall` both log only: prompt id,
prompt version, latency, retry count, and outcome (`ok`/`bad_json`/`failed`/
`rejected` + a short reason code like `"rate_limit"`). Never the answer text,
project text, audio, or the Gemini API key. Verified by inspection of both
files — the compiler can't verify "never logs a specific field" for us, so
this is a code-review-time invariant maintained by only ever passing that
struct shape to the logger.
