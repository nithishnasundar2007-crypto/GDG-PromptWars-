#!/usr/bin/env node
// CI safety net (docs/PHASE0_AUDIT.md section O): GEMINI_API_KEY must never
// reach the browser bundle. This is belt-and-braces on top of it never being
// a VITE_-prefixed variable in the first place (see contracts/README /
// config/index.ts) — if someone later adds VITE_GEMINI_API_KEY by mistake,
// this still catches it as long as the value is present in CI's env.
import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";

const DIST_DIR = join(process.cwd(), "apps/web/dist");
const key = process.env.GEMINI_API_KEY;

// Hard rule §3.2: this check must fire even when CI's own environment has no
// GEMINI_API_KEY set — a real Gemini key always starts with "AIza", so that
// literal substring is checked regardless of the env-value check above.
const AIZA_PREFIX = "AIza";

if (!existsSync(DIST_DIR)) {
  console.error(`✗ ${DIST_DIR} does not exist — run "npm run build" first.`);
  process.exit(1);
}

function walk(dir) {
  let files = [];
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) files = files.concat(walk(full));
    else files.push(full);
  }
  return files;
}

let found = false;
for (const file of walk(DIST_DIR)) {
  let content = "";
  try {
    content = readFileSync(file, "utf-8");
  } catch {
    continue; // binary asset (image, font, etc.) — not a place a string key would appear as text
  }
  if (key && content.includes(key)) {
    found = true;
    console.error(`✗ Found GEMINI_API_KEY value in bundled file: ${file}`);
  }
  if (content.includes(AIZA_PREFIX)) {
    found = true;
    console.error(`✗ Found a string starting with "${AIZA_PREFIX}" (looks like a real Gemini API key) in bundled file: ${file}`);
  }
}

if (found) {
  console.error("\nThe Gemini key must never reach the browser bundle. See docs/PHASE0_AUDIT.md section I/J.");
  process.exit(1);
}

if (!key) {
  console.log("GEMINI_API_KEY not set in this environment — checked for the \"AIza\" prefix only.");
}
console.log("✓ No Gemini API key value (env-set or AIza-prefixed) found in apps/web/dist.");
