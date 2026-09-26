// PRD §7.5 — builds the Express app (origin allow-list, request-size limit,
// the fixed /v1/* router). Split from server.ts so tests can exercise the
// app directly (supertest) without binding a real port.

import express from "express";
import { config } from "./config.js";
import { router } from "./router.js";

export function createApp(): express.Express {
  const app = express();

  // Hard rule §3.2: tighten the request-size limit below Express's default,
  // bounded by the largest single field any /v1/* body carries (project
  // text at 20k chars plus JSON overhead comfortably fits in 256kb).
  app.use(express.json({ limit: "256kb" }));

  app.use((req, res, next) => {
    const origin = req.headers.origin;
    if (origin && origin !== config.allowedOrigin) {
      res.status(403).json({ error: "Origin not allowed" });
      return;
    }
    res.setHeader("Access-Control-Allow-Origin", config.allowedOrigin);
    next();
  });

  app.use(router);

  // Never leak a stack trace or the raw error message to the client. Known
  // client-error statuses (e.g. body-parser's 413 for an oversized body)
  // pass through as a status code only; everything else becomes a generic 500.
  app.use((err: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
    const status = typeof err === "object" && err !== null && "status" in err && typeof err.status === "number" && err.status >= 400 && err.status < 500 ? err.status : 500;
    res.status(status).json({ error: status === 500 ? "Internal error" : "Request rejected" });
  });

  return app;
}
