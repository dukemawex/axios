import { PrismaClient } from '@prisma/client';
import { AppError } from '../middleware/error.middleware';
import type { Currency, ExchangeRate } from '@axios-pay/types';

const prisma = new PrismaClient();

const CURRENCIES: Currency[] = ['NGN', 'UGX', 'KES', 'GHS', 'ZAR'];

// ─── Seed rates (approximate real-world mid-market rates, Dec 2024) ───────────
// All rates are relative to USD as reference
const USD_RATES: Record<Currency, number> = {
  NGN: 1580,
  UGX: 3780,
  KES: 129,
  GHS: 15.3,
  ZAR: 18.6,
};

function serializeRate(r: {
  id: string;
  fromCurrency: string;
  toCurrency: string;
  rate: { toString(): string };
  updatedAt: Date;
}): ExchangeRate {
  return {
    id: r.id,
    fromCurrency: r.fromCurrency as Currency,
    toCurrency: r.toCurrency as Currency,
    rate: r.rate.toString(),
    updatedAt: r.updatedAt.toISOString(),
  };
}

export async function getExchangeRate(
  fromCurrency: Currency,
  toCurrency: Currency,
): Promise<ExchangeRate> {
  const rate = await prisma.exchangeRate.findUnique({
    where: { fromCurrency_toCurrency: { fromCurrency, toCurrency } },
  });

  if (!rate) {
    throw new AppError('RATE_NOT_FOUND');
  }

  return serializeRate(rate);
}

export async function getAllRates(): Promise<ExchangeRate[]> {
  const rates = await prisma.exchangeRate.findMany({
    orderBy: [{ fromCurrency: 'asc' }, { toCurrency: 'asc' }],
  });

  return rates.map(serializeRate);
}

export async function updateRates(): Promise<{ updated: number }> {
  const pairs: Array<{ fromCurrency: Currency; toCurrency: Currency; rate: number }> = [];

  // Compute cross rates from USD base
  for (const from of CURRENCIES) {
    for (const to of CURRENCIES) {
      if (from === to) continue;

      // rate = (USD per from) / (USD per to)
      // i.e. how much `to` you get for 1 `from`
      const rate = USD_RATES[to] / USD_RATES[from];
      pairs.push({ fromCurrency: from, toCurrency: to, rate });
    }
  }

  let updated = 0;
  for (const pair of pairs) {
    await prisma.exchangeRate.upsert({
      where: {
        fromCurrency_toCurrency: {
          fromCurrency: pair.fromCurrency,
          toCurrency: pair.toCurrency,
        },
      },
      update: { rate: pair.rate },
      create: {
        fromCurrency: pair.fromCurrency,
        toCurrency: pair.toCurrency,
        rate: pair.rate,
      },
    });
    updated++;
  }

  return { updated };
}

export async function seedRatesIfEmpty(): Promise<void> {
  const count = await prisma.exchangeRate.count();
  if (count === 0) {
    await updateRates();
    console.log('✅ Exchange rates seeded');
  }
}
