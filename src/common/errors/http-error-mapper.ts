/**
 * File: src/common/errors/http-error-mapper.ts
 * Module: common-errors
 * Purpose: Map AppError instances to HTTP response payloads.
 * Author: Cursor / BharatERP
 * Last-updated: 2026-01-15
 * Notes:
 * - Use in API handlers to standardize error responses.
 * - Map unknown errors to a safe fallback.
 */

import { AppError } from "./app-error"

export type HttpErrorPayload = {
  status: number
  body: {
    error: string
    code: string
    details?: unknown
  }
}

export const mapErrorToHttp = (
  error: unknown,
  fallbackMessage: string = "Internal Server Error"
): HttpErrorPayload => {
  if (error instanceof AppError) {
    return {
      status: error.statusCode,
      body: {
        error: error.message,
        code: error.code,
        details: error.details,
      },
    }
  }

  return {
    status: 500,
    body: {
      error: fallbackMessage,
      code: "INTERNAL_ERROR",
    },
  }
}
