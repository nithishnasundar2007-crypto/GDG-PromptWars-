#!/usr/bin/env node
// Owner: Uthai (M1 fills in real coverage). Checks the seed bank's shape
// before it reaches the app, and reports (without failing the build at M0)
// which topic-steps are still missing probe/confirm/retest questions, per
// the brief's data rules and PRD §8.2 build order item 2.
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";

const DATA_DIR = join(process.cwd(), "apps/web/src/data");
let errors = 0;
const warnings = [];

function readJson(path) {
  try {
    return JSON.parse(readFileSync(path, "utf-8"));
  } catch (e) {
    errors += 1;
    console.error(`✗ ${path}: invalid JSON (${e.message})`);
    return null;
  }
}

function walk(dir) {
  const files = [];
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) files.push(...walk(full));
    else if (entry.endsWith(".json")) files.push(full);
  }
  return files;
}

const REQUIRED_QUESTION_FIELDS = ["id", "topicId", "track", "role", "prompt", "rubrics", "targetTimeMs"];
const REQUIRED_ROLES = ["probe", "confirm", "retest"];

const companyFiles = walk(join(DATA_DIR, "companies"));
const questionFiles = walk(join(DATA_DIR, "questions"));

const questionsByTopic = new Map();

for (const file of questionFiles) {
  const q = readJson(file);
  if (!q) continue;
  for (const field of REQUIRED_QUESTION_FIELDS) {
    if (!(field in q)) {
      errors += 1;
      console.error(`✗ ${file}: missing required field "${field}"`);
    }
  }
  if (q.lang && !q.tests) {
    warnings.push(`${file}: has a language but no tests (Apply step needs hidden tests)`);
  }
  const list = questionsByTopic.get(q.topicId) ?? [];
  list.push(q);
  questionsByTopic.set(q.topicId, list);
}

for (const [topicId, questions] of questionsByTopic) {
  const roles = new Set(questions.map((q) => q.role));
  for (const role of REQUIRED_ROLES) {
    if (!roles.has(role)) {
      warnings.push(`topic "${topicId}": missing a "${role}" question (needed before this topic-step is demo-ready)`);
    }
  }
}

const topicFiles = ["topics.json", "topics.two-week.json"].map((f) => join(DATA_DIR, f));
for (const file of topicFiles) {
  const topics = readJson(file);
  for (const t of topics ?? []) {
    if (!questionsByTopic.has(t.id)) warnings.push(`topic "${t.id}" (${file.split(/[\/]/).pop()}): has no questions at all`);
  }
}

for (const file of companyFiles) {
  const c = readJson(file);
  if (!c) continue;
  if (!c.id || !c.name || !Array.isArray(c.rounds)) {
    errors += 1;
    console.error(`✗ ${file}: Company must have id, name, rounds[]`);
  }
}

if (warnings.length) {
  console.warn(`\n${warnings.length} coverage warning(s) (not build-breaking at M0):`);
  for (const w of warnings) console.warn(`  - ${w}`);
}

if (errors > 0) {
  console.error(`\n${errors} error(s). Fix the seed JSON above.`);
  process.exit(1);
}

console.log(`\n✓ Seed bank shape OK (${questionFiles.length} question file(s), ${companyFiles.length} company file(s)).`);
