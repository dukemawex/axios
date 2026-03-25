'use client';

import { useRef, useCallback, KeyboardEvent, ClipboardEvent, ChangeEvent } from 'react';

interface OtpInputProps {
  length?: number;
  value: string;
  onChange: (value: string) => void;
  onComplete?: (value: string) => void;
}

export default function OtpInput({ length = 6, value, onChange, onComplete }: OtpInputProps) {
  const inputRefs = useRef<Array<HTMLInputElement | null>>([]);

  const digits = Array.from({ length }, (_, i) => value[i] ?? '');

  const updateValue = useCallback(
    (newDigits: string[]) => {
      const newValue = newDigits.join('');
      onChange(newValue);
      if (newValue.length === length) {
        onComplete?.(newValue);
      }
    },
    [length, onChange, onComplete],
  );

  function focusInput(index: number) {
    const el = inputRefs.current[index];
    if (el) {
      el.focus();
      el.select();
    }
  }

  function handleChange(index: number, e: ChangeEvent<HTMLInputElement>) {
    const raw = e.target.value.replace(/\D/g, '');
    if (!raw) return;

    const newDigits = [...digits];

    // Handle pasting multiple digits into a single field
    if (raw.length > 1) {
      const pastedDigits = raw.slice(0, length - index);
      for (let i = 0; i < pastedDigits.length; i++) {
        newDigits[index + i] = pastedDigits[i] ?? '';
      }
      updateValue(newDigits);
      const nextIndex = Math.min(index + pastedDigits.length, length - 1);
      focusInput(nextIndex);
      return;
    }

    newDigits[index] = raw[0] ?? '';
    updateValue(newDigits);

    if (index < length - 1) {
      focusInput(index + 1);
    }
  }

  function handleKeyDown(index: number, e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Backspace') {
      e.preventDefault();
      const newDigits = [...digits];

      if (newDigits[index]) {
        newDigits[index] = '';
        updateValue(newDigits);
      } else if (index > 0) {
        newDigits[index - 1] = '';
        updateValue(newDigits);
        focusInput(index - 1);
      }
    } else if (e.key === 'ArrowLeft' && index > 0) {
      focusInput(index - 1);
    } else if (e.key === 'ArrowRight' && index < length - 1) {
      focusInput(index + 1);
    }
  }

  function handlePaste(e: ClipboardEvent<HTMLInputElement>) {
    e.preventDefault();
    const pasted = e.clipboardData.getData('text/plain').replace(/\D/g, '').slice(0, length);
    if (!pasted) return;

    const newDigits = [...digits];
    for (let i = 0; i < pasted.length; i++) {
      newDigits[i] = pasted[i] ?? '';
    }
    updateValue(newDigits);
    focusInput(Math.min(pasted.length, length - 1));
  }

  return (
    <div className="flex justify-center gap-3">
      {digits.map((digit, index) => (
        <input
          key={index}
          ref={(el) => {
            inputRefs.current[index] = el;
          }}
          type="text"
          inputMode="numeric"
          pattern="\d*"
          maxLength={1}
          value={digit}
          onChange={(e) => handleChange(index, e)}
          onKeyDown={(e) => handleKeyDown(index, e)}
          onPaste={handlePaste}
          onFocus={(e) => e.target.select()}
          autoComplete={index === 0 ? 'one-time-code' : 'off'}
          aria-label={`Digit ${index + 1} of ${length}`}
          className={`h-12 w-12 rounded-lg border-2 text-center text-lg font-semibold text-gray-900 transition-colors focus:outline-none ${
            digit
              ? 'border-brand-500 bg-brand-50'
              : 'border-gray-300 bg-white focus:border-brand-500'
          }`}
        />
      ))}
    </div>
  );
}
