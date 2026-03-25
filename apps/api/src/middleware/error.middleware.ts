import { Request, Response, NextFunction } from 'express';

export const ERROR_RESPONSES = {
  UNAUTHORIZED: { status: 401, code: 'UNAUTHORIZED', message: 'Authentication required' },
  FORBIDDEN: { status: 403, code: 'FORBIDDEN', message: 'Access denied' },
  NOT_FOUND: { status: 404, code: 'NOT_FOUND', message: 'Resource not found' },
  VALIDATION_ERROR: { status: 422, code: 'VALIDATION_ERROR', message: 'Validation failed' },
  INSUFFICIENT_BALANCE: { status: 400, code: 'INSUFFICIENT_BALANCE', message: 'Insufficient wallet balance' },
  INVALID_OTP: { status: 400, code: 'INVALID_OTP', message: 'Invalid or expired OTP' },
  EMAIL_EXISTS: { status: 409, code: 'EMAIL_EXISTS', message: 'Email already registered' },
  INVALID_CREDENTIALS: { status: 401, code: 'INVALID_CREDENTIALS', message: 'Invalid email or password' },
  RATE_NOT_FOUND: { status: 404, code: 'RATE_NOT_FOUND', message: 'Exchange rate not available' },
  PAYMENT_FAILED: { status: 400, code: 'PAYMENT_FAILED', message: 'Payment initiation failed' },
  INTERNAL_ERROR: { status: 500, code: 'INTERNAL_ERROR', message: 'Internal server error' },
} as const;

export type ErrorCode = keyof typeof ERROR_RESPONSES;

export class AppError extends Error {
  public readonly statusCode: number;
  public readonly code: ErrorCode;
  public readonly details?: unknown;

  constructor(errorCode: ErrorCode, details?: unknown) {
    const errorDef = ERROR_RESPONSES[errorCode];
    super(errorDef.message);
    this.name = 'AppError';
    this.statusCode = errorDef.status;
    this.code = errorCode;
    this.details = details;
  }
}

export function errorMiddleware(
  err: Error,
  _req: Request,
  res: Response,
  _next: NextFunction,
): void {
  if (err instanceof AppError) {
    res.status(err.statusCode).json({
      error: {
        code: err.code,
        message: err.message,
        ...(err.details !== undefined && { details: err.details }),
      },
    });
    return;
  }

  // Map known error strings to AppError codes
  const errorMessage = err.message;

  if (errorMessage === 'INSUFFICIENT_BALANCE') {
    res.status(ERROR_RESPONSES.INSUFFICIENT_BALANCE.status).json({
      error: ERROR_RESPONSES.INSUFFICIENT_BALANCE,
    });
    return;
  }

  if (errorMessage === 'INVALID_OTP') {
    res.status(ERROR_RESPONSES.INVALID_OTP.status).json({
      error: ERROR_RESPONSES.INVALID_OTP,
    });
    return;
  }

  // Prisma not found error
  if (err.constructor?.name === 'PrismaClientKnownRequestError') {
    const prismaErr = err as Error & { code?: string };
    if (prismaErr.code === 'P2025') {
      res.status(ERROR_RESPONSES.NOT_FOUND.status).json({
        error: ERROR_RESPONSES.NOT_FOUND,
      });
      return;
    }
  }

  // Generic fallback
  console.error('Unhandled error:', err);
  res.status(ERROR_RESPONSES.INTERNAL_ERROR.status).json({
    error: ERROR_RESPONSES.INTERNAL_ERROR,
  });
}
