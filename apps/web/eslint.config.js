import js from "@eslint/js";
import tseslint from "typescript-eslint";
import reactHooks from "eslint-plugin-react-hooks";
import reactRefresh from "eslint-plugin-react-refresh";
import prettier from "eslint-config-prettier";

// Import-boundary rules enforce docs/PHASE0_AUDIT.md sections F/G:
// screens never import engine/* or grading/* directly, and nothing outside
// grading/ai talks to the ai-proxy.
const SCREEN_RESTRICTIONS = {
  patterns: [
    { group: ["**/engine", "**/engine/*"], message: "Screens must go through lib/api, not engine/* directly." },
    { group: ["**/grading", "**/grading/*"], message: "Screens must go through lib/api, not grading/* directly." },
  ],
};

export default tseslint.config(
  { ignores: ["dist", "node_modules"] },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  prettier,
  {
    files: ["**/*.{ts,tsx}"],
    plugins: {
      "react-hooks": reactHooks,
      "react-refresh": reactRefresh,
    },
    rules: {
      ...reactHooks.configs.recommended.rules,
      "react-refresh/only-export-components": "warn",
      "@typescript-eslint/no-unused-vars": ["warn", { argsIgnorePattern: "^_" }],
    },
  },
  {
    files: ["src/screens/**/*.{ts,tsx}"],
    rules: {
      "no-restricted-imports": ["error", SCREEN_RESTRICTIONS],
    },
  },
  {
    // Nothing in apps/web should ever import a Gemini SDK directly — the
    // Gemini key and the SDK call both live only in apps/ai-proxy;
    // grading/ai talks to it over `fetch`, never the SDK (docs/CONFLICTS.md,
    // "Result-vs-throw adapter" entry's sibling note on the proxy boundary).
    // Named for both the current (`@google/genai`) and the superseded
    // (`@google/generative-ai`) package, so a future accidental import of
    // either is caught immediately, not just the one in use today.
    files: ["src/**/*.{ts,tsx}"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          paths: [
            { name: "@google/generative-ai", message: "The Gemini SDK belongs only in apps/ai-proxy; call it through grading/ai's fetch-based proxy client." },
            { name: "@google/genai", message: "The Gemini SDK belongs only in apps/ai-proxy; call it through grading/ai's fetch-based proxy client." },
          ],
        },
      ],
    },
  },
  {
    // Backend 1's own code (Suchit) — strict-type-checked, not just
    // recommended, per hard rule §3.1. Scoped here rather than repo-wide so
    // it doesn't force type-aware fixes onto engine/screens/shell, which
    // this session doesn't own.
    files: ["src/grading/**/*.ts"],
    extends: [...tseslint.configs.strictTypeChecked],
    languageOptions: {
      parserOptions: {
        project: "./tsconfig.app.json",
        tsconfigRootDir: import.meta.dirname,
      },
    },
    rules: {
      "@typescript-eslint/no-unused-vars": ["warn", { argsIgnorePattern: "^_" }],
      "@typescript-eslint/restrict-template-expressions": ["error", { allowNumber: true }],
    },
  },
  {
    files: ["src/grading/**/*.test.ts"],
    rules: {
      "@typescript-eslint/require-await": "off",
    },
  },
  {
    // tsconfig.app.json deliberately excludes *.ondemand.eval.ts (the real
    // 30-answer eval run, never part of the type-checked app build) — so it
    // has no TS project to type-check against here either.
    files: ["src/grading/**/*.ondemand.eval.ts"],
    extends: [tseslint.configs.disableTypeChecked],
  },
);
