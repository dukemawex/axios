import crypto from 'crypto';
import { PrismaClient } from '@prisma/client';
import { env } from '../config/env';
import { AppError } from '../middleware/error.middleware';
import type { Currency } from '@axios-pay/types';

const prisma = new PrismaClient();

interface InterswitchTokenResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
  scope: string;
}

interface InterswitchPaymentResponse {
  transactionReference: string;
  paymentUrl: string;
  amount: number;
  currency: string;
}

interface InterswitchPaymentStatus {
  responseCode: string;
  responseDescription: string;
  transactionReference: string;
  amount: number;
  currency: string;
  paymentDate: string;
}

// ─── Token cache ──────────────────────────────────────────────────────────────

let cachedToken: string | null = null;
let tokenExpiresAt = 0;

async function getAccessToken(): Promise<string> {
  const now = Date.now();
  // Refresh 60 seconds before expiry
  if (cachedToken && now < tokenExpiresAt - 60_000) {
    return cachedToken;
  }

  const credentials = Buffer.from(
    `${env.INTERSWITCH_CLIENT_ID}:${env.INTERSWITCH_CLIENT_SECRET}`,
  ).toString('base64');

  const response = await fetch(`${env.INTERSWITCH_BASE_URL}/passport/oauth/token`, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${credentials}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      grant_type: 'client_credentials',
      scope: 'profile',
    }),
  });

  if (!response.ok) {
    const body = await response.text();
    console.error('Interswitch token error:', response.status, body);
    throw new AppError('PAYMENT_FAILED');
  }

  const data = (await response.json()) as InterswitchTokenResponse;
  cachedToken = data.access_token;
  tokenExpiresAt = now + data.expires_in * 1000;

  return cachedToken;
}

// ─── Payment initiation ───────────────────────────────────────────────────────

export async function initiatePayment(data: {
  userId: string;
  currency: Currency;
  amount: string;
  redirectUrl: string;
}): Promise<{ paymentUrl: string; reference: string }> {
  const accessToken = await getAccessToken();

  // Generate a unique payment reference
  const reference = `AXPAY-${Date.now()}-${crypto.randomBytes(4).toString('hex').toUpperCase()}`;

  // Interswitch expects amount in kobo/cents (minor currency units)
  const amountInMinorUnits = Math.round(parseFloat(data.amount) * 100);

  const payload = {
    merchantCode: env.INTERSWITCH_MERCHANT_CODE,
    payableCode: env.INTERSWITCH_PAY_ITEM_ID,
    amount: amountInMinorUnits,
    redirectUrl: data.redirectUrl,
    transactionReference: reference,
    currencyCode: getCurrencyCode(data.currency),
    customerId: data.userId,
    customerEmail: '',
  };

  const response = await fetch(`${env.INTERSWITCH_BASE_URL}/collections/api/v1/pay`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const body = await response.text();
    console.error('Interswitch payment initiation error:', response.status, body);
    throw new AppError('PAYMENT_FAILED');
  }

  const result = (await response.json()) as InterswitchPaymentResponse;

  // Store pending transaction
  await prisma.transaction.create({
    data: {
      userId: data.userId,
      type: 'DEPOSIT',
      status: 'PENDING',
      toCurrency: data.currency,
      toAmount: parseFloat(data.amount),
      reference,
      interswitchRef: result.transactionReference,
      metadata: { redirectUrl: data.redirectUrl },
    },
  });

  return {
    paymentUrl: result.paymentUrl,
    reference,
  };
}

// ─── Payment status check ─────────────────────────────────────────────────────

export async function verifyPayment(reference: string): Promise<{
  success: boolean;
  status: string;
  reference: string;
}> {
  const accessToken = await getAccessToken();

  const response = await fetch(
    `${env.INTERSWITCH_BASE_URL}/collections/api/v1/gettransaction.json?merchantcode=${env.INTERSWITCH_MERCHANT_CODE}&transactionreference=${reference}&amount=0`,
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    },
  );

  if (!response.ok) {
    throw new AppError('PAYMENT_FAILED');
  }

  const data = (await response.json()) as InterswitchPaymentStatus;
  const success = data.responseCode === '00';

  // Update transaction status
  const transaction = await prisma.transaction.findUnique({ where: { reference } });
  if (transaction) {
    await prisma.transaction.update({
      where: { reference },
      data: { status: success ? 'COMPLETED' : 'FAILED' },
    });

    // Credit wallet on success
    if (success && transaction.toCurrency && transaction.toAmount) {
      await prisma.wallet.upsert({
        where: {
          userId_currency: {
            userId: transaction.userId,
            currency: transaction.toCurrency,
          },
        },
        update: { balance: { increment: transaction.toAmount } },
        create: {
          userId: transaction.userId,
          currency: transaction.toCurrency,
          balance: transaction.toAmount,
        },
      });
    }
  }

  return {
    success,
    status: data.responseDescription,
    reference,
  };
}

// ─── Webhook signature verification ──────────────────────────────────────────

export function verifyWebhookSignature(rawBody: string, signature: string): boolean {
  const expectedSignature = crypto
    .createHmac('sha512', env.INTERSWITCH_WEBHOOK_SECRET)
    .update(rawBody)
    .digest('hex');

  // Constant-time comparison to prevent timing attacks
  try {
    return crypto.timingSafeEqual(
      Buffer.from(signature, 'hex'),
      Buffer.from(expectedSignature, 'hex'),
    );
  } catch {
    return false;
  }
}

// ─── Currency code mapping ────────────────────────────────────────────────────

function getCurrencyCode(currency: Currency): string {
  const codes: Record<Currency, string> = {
    NGN: '566',
    UGX: '800',
    KES: '404',
    GHS: '936',
    ZAR: '710',
  };
  return codes[currency];
}
