/**
 * App error codes registry.
 * Every code must be UPPER_SNAKE and listed here.
 * Used in the standard error shape returned by all endpoints.
 */
export const ERROR_CODES = {
  // General
  INTERNAL_SERVER_ERROR: 'INTERNAL_SERVER_ERROR',
  NOT_FOUND: 'NOT_FOUND',
  RATE_LIMIT_EXCEEDED: 'RATE_LIMIT_EXCEEDED',

  // Validation
  VALIDATION_FAILED: 'VALIDATION_FAILED',
  INVALID_REQUEST_ID: 'INVALID_REQUEST_ID',

  // Wearable (B2.1)
  WEARABLE_PAYLOAD_INVALID: 'WEARABLE_PAYLOAD_INVALID',
  WEARABLE_SOURCE_UNSUPPORTED: 'WEARABLE_SOURCE_UNSUPPORTED',
  WEARABLE_BATCH_TOO_LARGE: 'WEARABLE_BATCH_TOO_LARGE',
  DEMO_MODE_DISABLED: 'DEMO_MODE_DISABLED',

  // Flags (B3.1)
  FLAG_FIELD_NOT_ALLOWED: 'FLAG_FIELD_NOT_ALLOWED',
  FLAG_VALIDATION_FAILED: 'FLAG_VALIDATION_FAILED',
  MONITOR_SESSION_REQUIRED: 'MONITOR_SESSION_REQUIRED',
  MONITOR_SESSION_EXPIRED: 'MONITOR_SESSION_EXPIRED',
  MONITOR_SESSION_NOT_FOUND: 'MONITOR_SESSION_NOT_FOUND',
  
  // Crisis reviews (B3.1)
  REVIEW_TRANSITION_INVALID: 'REVIEW_TRANSITION_INVALID',
  REVIEW_NOT_FOUND: 'REVIEW_NOT_FOUND',
  REVIEW_ALREADY_ASSIGNED: 'REVIEW_ALREADY_ASSIGNED',

  // Auth (B1.3)
  UNAUTHORIZED: 'UNAUTHORIZED',
  FORBIDDEN: 'FORBIDDEN',
  CONSENT_REQUIRED: 'CONSENT_REQUIRED',

  // Database (B1.2)
  DATABASE_ERROR: 'DATABASE_ERROR',

  // Population (B4.1)
  POPULATION_DATA_NOT_READY: 'POPULATION_DATA_NOT_READY',

  // Health checks
  SERVICE_UNAVAILABLE: 'SERVICE_UNAVAILABLE',
} as const;

export type ErrorCode = typeof ERROR_CODES[keyof typeof ERROR_CODES];

/**
 * Application error class.
 * Produces the standard error shape:
 * { statusCode, error, code, message, requestId }
 */
export class AppError extends Error {
  constructor(
    readonly statusCode: number,
    readonly code: ErrorCode,
    readonly message: string,
  ) {
    super(message);
    this.name = 'AppError';
  }
}

export function createAppError(
  statusCode: number,
  code: ErrorCode,
  message: string,
): AppError {
  return new AppError(statusCode, code, message);
}

// Common error creators
export const Errors = {
  notFound: (message: string) =>
    createAppError(404, ERROR_CODES.NOT_FOUND, message),
  validationFailed: (message: string) =>
    createAppError(422, ERROR_CODES.VALIDATION_FAILED, message),
  unauthorized: () =>
    createAppError(401, ERROR_CODES.UNAUTHORIZED, 'Unauthorized'),
  forbidden: () =>
    createAppError(403, ERROR_CODES.FORBIDDEN, 'Forbidden'),
  rateLimitExceeded: () =>
    createAppError(429, ERROR_CODES.RATE_LIMIT_EXCEEDED, 'Rate limit exceeded'),
  serviceUnavailable: (message: string) =>
    createAppError(503, ERROR_CODES.SERVICE_UNAVAILABLE, message),
  internalServerError: () =>
    createAppError(500, ERROR_CODES.INTERNAL_SERVER_ERROR, 'Internal server error'),
};
