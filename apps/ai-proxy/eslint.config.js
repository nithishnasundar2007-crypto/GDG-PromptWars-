// PRD §7.5 / hard rule §3.1 — ai-proxy had no lint enforcement at all before
// this (no config, no script, and the root `npm run lint` only covered
// `web`). strict-type-checked, not just recommended, per the hard rule.

import js from "@eslint/js";
import tseslint from "typescript-eslint";
import prettier from "eslint-config-prettier";

export default tseslint.config(
  { ignores: ["dist", "coverage", "node_modules"] },
  js.configs.recommended,
  ...tseslint.configs.strictTypeChecked,
  prettier,
  {
    files: ["src/**/*.ts"],
    languageOptions: {
      parserOptions: {
        project: "./tsconfig.json",
        tsconfigRootDir: import.meta.dirname,
      },
    },
    rules: {
      "@typescript-eslint/no-unused-vars": ["warn", { argsIgnorePattern: "^_" }],
      // A number is always safe to interpolate; the unsafe cases this rule
      // guards against (objects, `any`) stay errors.
      "@typescript-eslint/restrict-template-expressions": ["error", { allowNumber: true }],
      // The proxy's own logger is the one sanctioned console user
      // (docs/SECURITY.md privacy rule); every call site is explicitly
      // eslint-disabled with a reason, not silently allowed everywhere.
      "no-console": "error",
    },
  },
  {
    // Test doubles are often declared `async` to satisfy a Promise-returning
    // interface even when a given branch has no real await inside it —
    // requiring one would mean fabricating a no-op await just to please the
    // rule. Production code still requires real awaits.
    files: ["src/**/*.test.ts"],
    rules: {
      "@typescript-eslint/require-await": "off",
    },
  },
  {
    // supertest types its Response#body as `any` by design (the body's real
    // shape depends on what the endpoint under test returns) — accessing
    // fields on it is inherently "unsafe" to the type checker, but the
    // test's own assertions are what actually enforce correctness here.
    files: ["src/router.test.ts", "src/router.more.test.ts"],
    rules: {
      "@typescript-eslint/no-unsafe-member-access": "off",
      "@typescript-eslint/no-unsafe-assignment": "off",
    },
  },
  {
    // vitest's expect.objectContaining()/expect.any() intentionally type as
    // `any` (they're matcher placeholders usable inside arbitrarily-shaped
    // object literals) — assigning one to a typed property is flagged as
    // "unsafe" by the type checker even though it's the documented, correct
    // way to use the matcher.
    files: ["src/gemini.test.ts"],
    rules: {
      "@typescript-eslint/no-unsafe-assignment": "off",
    },
  },
  {
    // Plain config/build files, not part of the TS project the type-aware
    // rules above run against.
    files: ["*.config.js", "*.config.ts"],
    extends: [tseslint.configs.disableTypeChecked],
  },
);
