// ─── Enums ────────────────────────────────────────────────────────────────────

export type Currency = 'NGN' | 'UGX' | 'KES' | 'GHS' | 'ZAR';

export const CURRENCIES: Currency[] = ['NGN', 'UGX', 'KES', 'GHS', 'ZAR'];

export const CURRENCY_LABELS: Record<Currency, string> = {
  NGN: 'Nigerian Naira',
  UGX: 'Ugandan Shilling',
  KES: 'Kenyan Shilling',
  GHS: 'Ghanaian Cedi',
  ZAR: 'South African Rand',
};

export const CURRENCY_SYMBOLS: Record<Currency, string> = {
  NGN: '₦',
  UGX: 'USh',
  KES: 'KSh',
  GHS: 'GH₵',
  ZAR: 'R',
};

export type TransactionStatus = 'PENDING' | 'COMPLETED' | 'FAILED';
export type TransactionType = 'SWAP' | 'DEPOSIT' | 'WITHDRAWAL';

// ─── User ─────────────────────────────────────────────────────────────────────

export interface User {
  id: string;
  email: string;
  phone: string | null;
  firstName: string;
  lastName: string;
  emailVerified: boolean;
  phoneVerified: boolean;
  createdAt: string;
  updatedAt: string;
}

// ─── Wallet ───────────────────────────────────────────────────────────────────

export interface Wallet {
  id: string;
  userId: string;
  currency: Currency;
  balance: string;
  createdAt: string;
  updatedAt: string;
}

// ─── Transaction ──────────────────────────────────────────────────────────────

export interface Transaction {
  id: string;
  userId: string;
  type: TransactionType;
  status: TransactionStatus;
  fromCurrency: Currency | null;
  toCurrency: Currency | null;
  fromAmount: string | null;
  toAmount: string | null;
  fee: string | null;
  rate: string | null;
  reference: string;
  interswitchRef: string | null;
  metadata: Record<string, unknown> | null;
  createdAt: string;
  updatedAt: string;
}

// ─── Exchange Rate ─────────────────────────────────────────────────────────────

export interface ExchangeRate {
  id: string;
  fromCurrency: Currency;
  toCurrency: Currency;
  rate: string;
  updatedAt: string;
}

// ─── API Request / Response ───────────────────────────────────────────────────

export interface RegisterRequest {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  phone?: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface VerifyEmailRequest {
  email: string;
  otp: string;
}

export interface VerifyPhoneRequest {
  phone: string;
  otp: string;
}

export interface RefreshTokenRequest {
  refreshToken: string;
}

export interface SwapRequest {
  fromCurrency: Currency;
  toCurrency: Currency;
  fromAmount: string;
}

export interface InitiatePaymentRequest {
  currency: Currency;
  amount: string;
  redirectUrl: string;
}

export interface AuthResponse {
  user: User;
  accessToken: string;
  refreshToken: string;
}

export interface SwapQuote {
  fromCurrency: Currency;
  toCurrency: Currency;
  fromAmount: string;
  fee: string;
  netFromAmount: string;
  toAmount: string;
  rate: string;
  feePercent: number;
}

// ─── API Error ────────────────────────────────────────────────────────────────

export interface ApiError {
  code: string;
  message: string;
  details?: unknown;
}

export interface ApiResponse<T> {
  data?: T;
  error?: ApiError;
}

// ─── Pagination ───────────────────────────────────────────────────────────────

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}
