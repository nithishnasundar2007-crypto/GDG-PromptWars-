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
    // Only grading/ai's provider adapter may call the ai-proxy / a Gemini SDK.
    files: ["src/**/*.{ts,tsx}"],
    ignores: ["src/grading/ai/**"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          paths: [{ name: "@google/generative-ai", message: "Only grading/ai may talk to Gemini." }],
        },
      ],
    },
  },
);
