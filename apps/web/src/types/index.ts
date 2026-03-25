// Re-export shared types for convenience within the web app
export type {
  Currency,
  User,
  Wallet,
  Transaction,
  ExchangeRate,
  SwapRequest,
  SwapQuote,
  AuthResponse,
  LoginRequest,
  RegisterRequest,
  VerifyEmailRequest,
  VerifyPhoneRequest,
  RefreshTokenRequest,
  InitiatePaymentRequest,
  ApiError,
  ApiResponse,
  PaginatedResponse,
  TransactionStatus,
  TransactionType,
} from '@axios-pay/types';

export { CURRENCIES, CURRENCY_LABELS, CURRENCY_SYMBOLS } from '@axios-pay/types';
