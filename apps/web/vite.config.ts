/// <reference types="vitest/config" />
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import { viteStaticCopy } from 'vite-plugin-static-copy'

// PRD §7.5 / hard rule §3.3 — pyodide and sql.js are served same-origin from
// the npm packages (pinned in apps/web/package.json), never a CDN. Their
// non-JS assets (wasm, the stdlib zip, sql.js's wasm) aren't picked up by
// Vite's normal module graph, so they're copied verbatim into the build
// output (and served as-is in dev via publicDir-style static copy) under
// /pyodide/ and /sqljs/ — see docs/RUNNER_SPIKE.md for how runner/python-
// host.ts and runner/sql-host.ts point loadPyodide/initSqlJs at these paths.
//
// COOP/COEP headers here only cover `npm run dev` (Vite's own dev server) —
// production headers belong in firebase.json (Shruthi owns Hosting config;
// see docs/BACKEND1_REPORT.md's handoff note). Both are needed for
// SharedArrayBuffer, which Pyodide's interruptBuffer timeout path requires.
export default defineConfig({
  plugins: [
    react(),
    viteStaticCopy({
      targets: [
        {
          // Hoisted to the workspace root by npm workspaces, not
          // apps/web/node_modules — resolve relative to the monorepo root.
          src: '../../node_modules/pyodide/*',
          dest: 'pyodide',
        },
        {
          src: '../../node_modules/sql.js/dist/sql-wasm.wasm',
          dest: 'sqljs',
        },
      ],
    }),
  ],
  worker: {
    format: 'es',
  },
  server: {
    headers: {
      'Cross-Origin-Opener-Policy': 'same-origin',
      'Cross-Origin-Embedder-Policy': 'require-corp',
    },
  },
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
  },
})
