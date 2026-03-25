import { PrismaClient } from '@prisma/client';
import Decimal from 'decimal.js';
import { AppError } from '../middleware/error.middleware';
import type { Currency, SwapRequest, Transaction, Wallet } from '@axios-pay/types';

const prisma = new PrismaClient();

function serializeTransaction(tx: {
  id: string;
  userId: string;
  type: string;
  status: string;
  fromCurrency: string | null;
  toCurrency: string | null;
  fromAmount: { toString(): string } | null;
  toAmount: { toString(): string } | null;
  fee: { toString(): string } | null;
  rate: { toString(): string } | null;
  reference: string;
  interswitchRef: string | null;
  metadata: unknown;
  createdAt: Date;
  updatedAt: Date;
}): Transaction {
  return {
    id: tx.id,
    userId: tx.userId,
    type: tx.type as Transaction['type'],
    status: tx.status as Transaction['status'],
    fromCurrency: tx.fromCurrency as Currency | null,
    toCurrency: tx.toCurrency as Currency | null,
    fromAmount: tx.fromAmount?.toString() ?? null,
    toAmount: tx.toAmount?.toString() ?? null,
    fee: tx.fee?.toString() ?? null,
    rate: tx.rate?.toString() ?? null,
    reference: tx.reference,
    interswitchRef: tx.interswitchRef,
    metadata: tx.metadata as Record<string, unknown> | null,
    createdAt: tx.createdAt.toISOString(),
    updatedAt: tx.updatedAt.toISOString(),
  };
}

function serializeWallet(w: {
  id: string;
  userId: string;
  currency: string;
  balance: { toString(): string };
  createdAt: Date;
  updatedAt: Date;
}): Wallet {
  return {
    id: w.id,
    userId: w.userId,
    currency: w.currency as Currency,
    balance: w.balance.toString(),
    createdAt: w.createdAt.toISOString(),
    updatedAt: w.updatedAt.toISOString(),
  };
}

export async function getWallets(userId: string): Promise<Wallet[]> {
  const wallets = await prisma.wallet.findMany({
    where: { userId },
    orderBy: { currency: 'asc' },
  });
  return wallets.map(serializeWallet);
}

export async function getTransactions(
  userId: string,
  page = 1,
  pageSize = 20,
): Promise<{ items: Transaction[]; total: number; page: number; pageSize: number; totalPages: number }> {
  const skip = (page - 1) * pageSize;

  const [items, total] = await prisma.$transaction([
    prisma.transaction.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      skip,
      take: pageSize,
    }),
    prisma.transaction.count({ where: { userId } }),
  ]);

  return {
    items: items.map(serializeTransaction),
    total,
    page,
    pageSize,
    totalPages: Math.ceil(total / pageSize),
  };
}

export async function executeSwap(userId: string, data: SwapRequest): Promise<Transaction> {
  const { fromCurrency, toCurrency, fromAmount } = data;

  if (fromCurrency === toCurrency) {
    throw new AppError('VALIDATION_ERROR');
  }

  const result = await prisma.$transaction(async (tx) => {
    // 1. Get exchange rate
    const exchangeRate = await tx.exchangeRate.findUniqueOrThrow({
      where: { fromCurrency_toCurrency: { fromCurrency, toCurrency } },
    });

    // 2. Calculate amounts with 1.5% fee
    const feeMultiplier = new Decimal('0.015');
    const fromAmountDecimal = new Decimal(fromAmount);
    const fee = fromAmountDecimal.mul(feeMultiplier);
    const netFromAmount = fromAmountDecimal.minus(fee);
    const toAmount = netFromAmount.mul(exchangeRate.rate);

    // 3. Check source wallet balance
    const sourceWallet = await tx.wallet.findUniqueOrThrow({
      where: { userId_currency: { userId, currency: fromCurrency } },
    });

    if (new Decimal(sourceWallet.balance.toString()).lt(fromAmountDecimal)) {
      throw new Error('INSUFFICIENT_BALANCE');
    }

    // 4. Debit source wallet
    await tx.wallet.update({
      where: { userId_currency: { userId, currency: fromCurrency } },
      data: { balance: { decrement: fromAmountDecimal.toNumber() } },
    });

    // 5. Credit destination wallet (upsert)
    await tx.wallet.upsert({
      where: { userId_currency: { userId, currency: toCurrency } },
      update: { balance: { increment: toAmount.toNumber() } },
      create: { userId, currency: toCurrency, balance: toAmount.toNumber() },
    });

    // 6. Create transaction record
    const transaction = await tx.transaction.create({
      data: {
        userId,
        type: 'SWAP',
        status: 'COMPLETED',
        fromCurrency,
        toCurrency,
        fromAmount: fromAmountDecimal.toDecimalPlaces(8).toNumber(),
        toAmount: toAmount.toDecimalPlaces(8).toNumber(),
        fee: fee.toDecimalPlaces(8).toNumber(),
        rate: new Decimal(exchangeRate.rate.toString()).toNumber(),
      },
    });

    return transaction;
  });

  return serializeTransaction(result);
}

export async function getSwapQuote(data: SwapRequest): Promise<{
  fromCurrency: Currency;
  toCurrency: Currency;
  fromAmount: string;
  fee: string;
  netFromAmount: string;
  toAmount: string;
  rate: string;
  feePercent: number;
}> {
  const { fromCurrency, toCurrency, fromAmount } = data;

  const exchangeRate = await prisma.exchangeRate.findUnique({
    where: { fromCurrency_toCurrency: { fromCurrency, toCurrency } },
  });

  if (!exchangeRate) {
    throw new AppError('RATE_NOT_FOUND');
  }

  const fromAmountDecimal = new Decimal(fromAmount);
  const feeMultiplier = new Decimal('0.015');
  const fee = fromAmountDecimal.mul(feeMultiplier);
  const netFromAmount = fromAmountDecimal.minus(fee);
  const toAmount = netFromAmount.mul(exchangeRate.rate.toString());

  return {
    fromCurrency,
    toCurrency,
    fromAmount: fromAmountDecimal.toString(),
    fee: fee.toDecimalPlaces(8).toString(),
    netFromAmount: netFromAmount.toDecimalPlaces(8).toString(),
    toAmount: toAmount.toDecimalPlaces(8).toString(),
    rate: exchangeRate.rate.toString(),
    feePercent: 1.5,
  };
}
