import { NextResponse } from "next/server";
import { ZodError } from "zod";

export class ApiError extends Error {
  constructor(public code: string, public message: string, public status = 400, public details?: unknown) {
    super(message);
  }
}

export function errorResponse(err: unknown): NextResponse {
  if (err instanceof ApiError) {
    return NextResponse.json({ error: { code: err.code, message: err.message, details: err.details } }, { status: err.status });
  }
  if (err instanceof ZodError) {
    return NextResponse.json(
      { error: { code: "validation.failed", message: "Invalid payload", details: err.flatten() } },
      { status: 400 }
    );
  }
  console.error("[api]", err);
  const message = err instanceof Error ? err.message : "Unknown error";
  return NextResponse.json({ error: { code: "internal", message } }, { status: 500 });
}

export function ok<T>(data: T, init?: ResponseInit): NextResponse {
  return NextResponse.json(data, init);
}
