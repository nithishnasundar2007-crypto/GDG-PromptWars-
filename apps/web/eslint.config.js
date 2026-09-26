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
      "@typescript-eslint/no-unused-vars": ["warn", { argsIgnorePattern: "^_", varsIgnorePattern: "^_" }],
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
    // strict-type-checked, not just recommended, per hard rule §3.1.
    // Scoped to grading (Suchit's own code) plus contracts/lib/config, which
    // are small, shared, and came back clean or near-clean. engine/** is
    // deliberately NOT included here: a first pass surfaced ~170 findings
    // there, nearly all non-null assertions across its test suite — real,
    // but a bulk rewrite of another owner's actively-developed module and
    // its tests is a bigger, riskier change than this pass should make
    // unilaterally. Left as a follow-up for Uthai, noted in
    // docs/EVALUATION_AUDIT.md.
    files: ["src/grading/**/*.ts", "src/contracts/**/*.ts", "src/lib/**/*.ts", "src/config/**/*.ts"],
    extends: [...tseslint.configs.strictTypeChecked],
    languageOptions: {
      parserOptions: {
        project: "./tsconfig.app.json",
        tsconfigRootDir: import.meta.dirname,
      },
    },
    rules: {
      "@typescript-eslint/no-unused-vars": ["warn", { argsIgnorePattern: "^_", varsIgnorePattern: "^_" }],
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
    // mocks.ts implements CompassApi's async interface with synchronous
    // fixture data by design (USE_MOCKS mode never touches the network or a
    // real DB) — every method being `async` with no `await` is the point,
    // not an oversight.
    files: ["src/contracts/mocks.ts"],
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
