/**
 * Project error hierarchy. Every error carries a stable `code` (consumed by the
 * API error contract) and an HTTP `status`.
 */
export class AppError extends Error {
  constructor(
    readonly code: string,
    message: string,
    readonly status: number = 500,
  ) {
    super(message);
    this.name = new.target.name;
  }
}

/** Input validation failure (HTTP 400). Carries the per-field issues. */
export class ValidationError extends AppError {
  constructor(
    message: string,
    readonly issues: ReadonlyArray<{ path: string; message: string }> = [],
  ) {
    super("VALIDATION_ERROR", message, 400);
  }
}
