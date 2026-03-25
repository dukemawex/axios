'use client';

import { useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import api from '@/lib/api';
import { useSwapStore } from '@/store/swap.store';
import { CURRENCY_SYMBOLS } from '@axios-pay/types';
import CurrencySelector from './CurrencySelector';
import type { SwapQuote, Transaction } from '@axios-pay/types';

const FEE_PERCENT = 1.5;
const QUOTE_DEBOUNCE_MS = 500;

export default function SwapWidget() {
  const router = useRouter();
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const {
    fromCurrency,
    toCurrency,
    fromAmount,
    quote,
    isLoadingQuote,
    quoteError,
    isSwapping,
    swapError,
    lastSwapTxId,
    setFromCurrency,
    setToCurrency,
    setFromAmount,
    setQuote,
    setLoadingQuote,
    setQuoteError,
    setSwapping,
    setSwapError,
    setLastSwapTxId,
    swapCurrencies,
    reset,
  } = useSwapStore();

  const fetchQuote = useCallback(
    async (amount: string) => {
      if (!amount || parseFloat(amount) <= 0) {
        setQuote(null);
        return;
      }

      setLoadingQuote(true);
      setQuoteError(null);

      try {
        const res = await api.get<{ quote: SwapQuote }>(
          `/wallets/swap/quote?fromCurrency=${fromCurrency}&toCurrency=${toCurrency}&fromAmount=${amount}`,
        );
        setQuote(res.data.quote);
      } catch (err: unknown) {
        const axiosErr = err as { response?: { data?: { error?: { message?: string } } } };
        setQuoteError(
          axiosErr.response?.data?.error?.message ?? 'Unable to fetch rate. Try again.',
        );
        setQuote(null);
      } finally {
        setLoadingQuote(false);
      }
    },
    [fromCurrency, toCurrency, setQuote, setLoadingQuote, setQuoteError],
  );

  // Debounce quote fetch on currency/amount changes
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      void fetchQuote(fromAmount);
    }, QUOTE_DEBOUNCE_MS);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [fromCurrency, toCurrency, fromAmount, fetchQuote]);

  async function handleSwap() {
    if (!quote || !fromAmount) return;

    setSwapping(true);
    setSwapError(null);

    try {
      const res = await api.post<{ transaction: Transaction }>('/wallets/swap', {
        fromCurrency,
        toCurrency,
        fromAmount,
      });
      setLastSwapTxId(res.data.transaction.id);
    } catch (err: unknown) {
      const axiosErr = err as { response?: { data?: { error?: { message?: string } } } };
      setSwapError(
        axiosErr.response?.data?.error?.message ?? 'Swap failed. Please try again.',
      );
    } finally {
      setSwapping(false);
    }
  }

  if (lastSwapTxId) {
    return (
      <div className="card space-y-5 text-center">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-green-100">
          <svg className="h-8 w-8 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <div>
          <h3 className="text-xl font-semibold text-gray-900">Swap successful!</h3>
          <p className="mt-1 text-sm text-gray-500">
            {CURRENCY_SYMBOLS[fromCurrency]}
            {parseFloat(fromAmount).toLocaleString()} {fromCurrency} →{' '}
            {quote
              ? `${CURRENCY_SYMBOLS[toCurrency]}${parseFloat(quote.toAmount).toLocaleString()} ${toCurrency}`
              : toCurrency}
          </p>
        </div>
        <div className="flex gap-3">
          <button onClick={() => reset()} className="btn-secondary flex-1">
            New swap
          </button>
          <button onClick={() => router.push('/dashboard')} className="btn-primary flex-1">
            Dashboard
          </button>
        </div>
      </div>
    );
  }

  const canSwap =
    !!quote &&
    !!fromAmount &&
    parseFloat(fromAmount) > 0 &&
    !isLoadingQuote &&
    !isSwapping;

  return (
    <div className="card space-y-6">
      <h2 className="text-lg font-semibold text-gray-900">Currency swap</h2>

      {/* From currency & amount */}
      <div className="space-y-3">
        <CurrencySelector
          label="You send"
          value={fromCurrency}
          onChange={setFromCurrency}
          exclude={toCurrency}
        />
        <div>
          <label className="mb-1.5 block text-sm font-medium text-gray-700">Amount</label>
          <div className="relative">
            <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-sm font-medium text-gray-500">
              {CURRENCY_SYMBOLS[fromCurrency]}
            </span>
            <input
              type="number"
              min="0"
              step="any"
              placeholder="0.00"
              value={fromAmount}
              onChange={(e) => setFromAmount(e.target.value)}
              className="input-field pl-8"
            />
          </div>
        </div>
      </div>

      {/* Swap direction button */}
      <div className="flex justify-center">
        <button
          type="button"
          onClick={swapCurrencies}
          className="flex h-10 w-10 items-center justify-center rounded-full border border-gray-200 bg-white text-gray-500 shadow-sm hover:border-brand-300 hover:text-brand-600 transition-colors"
          aria-label="Swap currencies"
        >
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M7 16V4m0 0L3 8m4-4l4 4M17 8v12m0 0l4-4m-4 4l-4-4"
            />
          </svg>
        </button>
      </div>

      {/* To currency */}
      <CurrencySelector
        label="You receive"
        value={toCurrency}
        onChange={setToCurrency}
        exclude={fromCurrency}
      />

      {/* Quote details */}
      <div className="rounded-xl bg-gray-50 p-4 space-y-2">
        {isLoadingQuote && (
          <div className="flex items-center gap-2 text-sm text-gray-500">
            <div className="h-4 w-4 animate-spin rounded-full border-2 border-brand-600 border-t-transparent" />
            Fetching rate…
          </div>
        )}

        {quoteError && (
          <p className="text-sm text-red-600">{quoteError}</p>
        )}

        {quote && !isLoadingQuote && (
          <>
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">Exchange rate</span>
              <span className="font-medium text-gray-900">
                1 {fromCurrency} = {parseFloat(quote.rate).toFixed(4)} {toCurrency}
              </span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">Fee ({FEE_PERCENT}%)</span>
              <span className="font-medium text-gray-900">
                {CURRENCY_SYMBOLS[fromCurrency]}
                {parseFloat(quote.fee).toFixed(4)} {fromCurrency}
              </span>
            </div>
            <div className="h-px bg-gray-200" />
            <div className="flex justify-between text-sm font-semibold">
              <span className="text-gray-700">You receive</span>
              <span className="text-brand-700">
                {CURRENCY_SYMBOLS[toCurrency]}
                {parseFloat(quote.toAmount).toLocaleString(undefined, {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 4,
                })}{' '}
                {toCurrency}
              </span>
            </div>
          </>
        )}

        {!quote && !isLoadingQuote && !quoteError && (
          <p className="text-sm text-gray-400">Enter an amount to see the exchange details.</p>
        )}
      </div>

      {swapError && (
        <div className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{swapError}</div>
      )}

      <button
        onClick={handleSwap}
        disabled={!canSwap}
        className="btn-primary w-full"
      >
        {isSwapping ? (
          <span className="flex items-center gap-2">
            <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
            Processing swap…
          </span>
        ) : (
          'Swap now'
        )}
      </button>
    </div>
  );
}
