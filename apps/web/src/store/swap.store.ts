import { create } from 'zustand';
import type { Currency, SwapQuote } from '@axios-pay/types';

interface SwapState {
  fromCurrency: Currency;
  toCurrency: Currency;
  fromAmount: string;
  quote: SwapQuote | null;
  isLoadingQuote: boolean;
  quoteError: string | null;
  isSwapping: boolean;
  swapError: string | null;
  lastSwapTxId: string | null;

  setFromCurrency: (currency: Currency) => void;
  setToCurrency: (currency: Currency) => void;
  setFromAmount: (amount: string) => void;
  setQuote: (quote: SwapQuote | null) => void;
  setLoadingQuote: (loading: boolean) => void;
  setQuoteError: (error: string | null) => void;
  setSwapping: (swapping: boolean) => void;
  setSwapError: (error: string | null) => void;
  setLastSwapTxId: (id: string | null) => void;
  swapCurrencies: () => void;
  reset: () => void;
}

const initialState = {
  fromCurrency: 'NGN' as Currency,
  toCurrency: 'KES' as Currency,
  fromAmount: '',
  quote: null,
  isLoadingQuote: false,
  quoteError: null,
  isSwapping: false,
  swapError: null,
  lastSwapTxId: null,
};

export const useSwapStore = create<SwapState>((set, get) => ({
  ...initialState,

  setFromCurrency: (fromCurrency) => set({ fromCurrency, quote: null, quoteError: null }),

  setToCurrency: (toCurrency) => set({ toCurrency, quote: null, quoteError: null }),

  setFromAmount: (fromAmount) => set({ fromAmount, quote: null, quoteError: null }),

  setQuote: (quote) => set({ quote }),

  setLoadingQuote: (isLoadingQuote) => set({ isLoadingQuote }),

  setQuoteError: (quoteError) => set({ quoteError }),

  setSwapping: (isSwapping) => set({ isSwapping }),

  setSwapError: (swapError) => set({ swapError }),

  setLastSwapTxId: (lastSwapTxId) => set({ lastSwapTxId }),

  swapCurrencies: () => {
    const { fromCurrency, toCurrency } = get();
    set({ fromCurrency: toCurrency, toCurrency: fromCurrency, quote: null, quoteError: null });
  },

  reset: () => set(initialState),
}));
