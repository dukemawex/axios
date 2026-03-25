'use client';

import { CURRENCIES, CURRENCY_LABELS, CURRENCY_SYMBOLS } from '@axios-pay/types';
import type { Currency } from '@axios-pay/types';

interface CurrencySelectorProps {
  value: Currency;
  onChange: (currency: Currency) => void;
  label?: string;
  exclude?: Currency;
  disabled?: boolean;
}

export default function CurrencySelector({
  value,
  onChange,
  label,
  exclude,
  disabled = false,
}: CurrencySelectorProps) {
  const options = CURRENCIES.filter((c) => c !== exclude);

  return (
    <div className="flex flex-col gap-1.5">
      {label && (
        <label className="text-sm font-medium text-gray-700">{label}</label>
      )}
      <div className="relative">
        <select
          value={value}
          onChange={(e) => onChange(e.target.value as Currency)}
          disabled={disabled}
          className="w-full appearance-none rounded-lg border border-gray-300 bg-white py-2.5 pl-10 pr-8 text-sm font-medium text-gray-900 shadow-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {options.map((currency) => (
            <option key={currency} value={currency}>
              {CURRENCY_SYMBOLS[currency]} {currency} – {CURRENCY_LABELS[currency]}
            </option>
          ))}
        </select>

        {/* Currency symbol overlay */}
        <div className="pointer-events-none absolute inset-y-0 left-3 flex items-center">
          <span className="text-sm font-bold text-brand-600">{CURRENCY_SYMBOLS[value]}</span>
        </div>

        {/* Chevron */}
        <div className="pointer-events-none absolute inset-y-0 right-2 flex items-center">
          <svg className="h-4 w-4 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </div>
    </div>
  );
}
