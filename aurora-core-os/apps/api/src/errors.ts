import type { Request, Response, NextFunction } from "express";
import { log } from "./log.js";

export class HttpError extends Error {
  constructor(public status: number, public code: string, message: string) { super(message); }
}

export function notFound(_: Request, res: Response) {
  res.status(404).json({ error: { code: "not_found", message: "Route not found" } });
}

export function errorHandler(err: any, req: Request, res: Response, _: NextFunction) {
  if (err instanceof HttpError) {
    return res.status(err.status).json({ error: { code: err.code, message: err.message } });
  }
  if (err?.name === "ZodError") {
    return res.status(422).json({ error: { code: "invalid_payload", message: "Validation failed", details: err.errors } });
  }
  log.error({ err, path: req.path }, "unhandled_error");
  res.status(500).json({ error: { code: "internal", message: "Internal server error" } });
}
