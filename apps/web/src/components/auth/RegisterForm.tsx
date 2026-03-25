'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import Link from 'next/link';
import api from '@/lib/api';
import type { RegisterRequest } from '@axios-pay/types';

type Step1Data = Pick<RegisterRequest, 'firstName' | 'lastName' | 'email' | 'password'>;
type Step2Data = { phone: string };
type AllData = Step1Data & Step2Data;

const TOTAL_STEPS = 3;

function StepIndicator({ current, total }: { current: number; total: number }) {
  return (
    <div className="mb-6 flex items-center justify-center gap-2">
      {Array.from({ length: total }, (_, i) => (
        <div
          key={i}
          className={`h-2 rounded-full transition-all ${
            i < current ? 'w-8 bg-brand-600' : i === current ? 'w-8 bg-brand-400' : 'w-4 bg-gray-200'
          }`}
        />
      ))}
    </div>
  );
}

export default function RegisterForm() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [serverError, setServerError] = useState('');
  const [collectedData, setCollectedData] = useState<Partial<AllData>>({});

  // Step 1 form
  const step1 = useForm<Step1Data>();
  // Step 2 form
  const step2 = useForm<Step2Data>();

  async function onStep1Submit(data: Step1Data) {
    setServerError('');
    setCollectedData((prev) => ({ ...prev, ...data }));
    setStep(1);
  }

  async function onStep2Submit(data: Step2Data) {
    setServerError('');
    const allData: RegisterRequest = {
      ...(collectedData as Step1Data),
      phone: data.phone || undefined,
    };

    try {
      await api.post('/auth/register', allData);
      setCollectedData((prev) => ({ ...prev, ...data }));
      setStep(2);
    } catch (err: unknown) {
      const axiosErr = err as { response?: { data?: { error?: { message?: string } } } };
      setServerError(
        axiosErr.response?.data?.error?.message ?? 'Registration failed. Please try again.',
      );
    }
  }

  function handleGoToVerify() {
    const email = collectedData.email ?? '';
    router.push(`/verify-email?email=${encodeURIComponent(email)}`);
  }

  return (
    <div className="card">
      <StepIndicator current={step} total={TOTAL_STEPS} />

      {/* ── Step 1: Personal info ─────────────────────────────────────────── */}
      {step === 0 && (
        <form onSubmit={step1.handleSubmit(onStep1Submit)} noValidate className="space-y-5">
          <h2 className="text-xl font-semibold text-gray-900">Create your account</h2>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700">
                First name
              </label>
              <input
                type="text"
                autoComplete="given-name"
                className="input-field"
                {...step1.register('firstName', { required: 'Required' })}
              />
              {step1.formState.errors.firstName && (
                <p className="mt-1 text-xs text-red-600">
                  {step1.formState.errors.firstName.message}
                </p>
              )}
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700">
                Last name
              </label>
              <input
                type="text"
                autoComplete="family-name"
                className="input-field"
                {...step1.register('lastName', { required: 'Required' })}
              />
              {step1.formState.errors.lastName && (
                <p className="mt-1 text-xs text-red-600">
                  {step1.formState.errors.lastName.message}
                </p>
              )}
            </div>
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium text-gray-700">
              Email address
            </label>
            <input
              type="email"
              autoComplete="email"
              className="input-field"
              {...step1.register('email', {
                required: 'Email is required',
                pattern: {
                  value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
                  message: 'Enter a valid email',
                },
              })}
            />
            {step1.formState.errors.email && (
              <p className="mt-1 text-xs text-red-600">{step1.formState.errors.email.message}</p>
            )}
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium text-gray-700">Password</label>
            <input
              type="password"
              autoComplete="new-password"
              className="input-field"
              {...step1.register('password', {
                required: 'Password is required',
                minLength: { value: 8, message: 'At least 8 characters' },
              })}
            />
            {step1.formState.errors.password && (
              <p className="mt-1 text-xs text-red-600">
                {step1.formState.errors.password.message}
              </p>
            )}
          </div>

          <button
            type="submit"
            disabled={step1.formState.isSubmitting}
            className="btn-primary w-full"
          >
            Continue
          </button>

          <p className="text-center text-sm text-gray-600">
            Already have an account?{' '}
            <Link href="/login" className="font-medium text-brand-600 hover:text-brand-700">
              Sign in
            </Link>
          </p>
        </form>
      )}

      {/* ── Step 2: Phone number ──────────────────────────────────────────── */}
      {step === 1 && (
        <form onSubmit={step2.handleSubmit(onStep2Submit)} noValidate className="space-y-5">
          <h2 className="text-xl font-semibold text-gray-900">Add your phone number</h2>
          <p className="text-sm text-gray-500">
            Optional but recommended for two-factor authentication.
          </p>

          <div>
            <label className="mb-1.5 block text-sm font-medium text-gray-700">
              Phone number
            </label>
            <input
              type="tel"
              autoComplete="tel"
              placeholder="+234 800 000 0000"
              className="input-field"
              {...step2.register('phone')}
            />
          </div>

          {serverError && (
            <div className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{serverError}</div>
          )}

          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => setStep(0)}
              className="btn-secondary flex-1"
            >
              Back
            </button>
            <button
              type="submit"
              disabled={step2.formState.isSubmitting}
              className="btn-primary flex-1"
            >
              {step2.formState.isSubmitting ? 'Creating account…' : 'Create account'}
            </button>
          </div>
        </form>
      )}

      {/* ── Step 3: Success / OTP prompt ─────────────────────────────────── */}
      {step === 2 && (
        <div className="space-y-5 text-center">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-green-100">
            <svg
              className="h-8 w-8 text-green-600"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M5 13l4 4L19 7"
              />
            </svg>
          </div>
          <h2 className="text-xl font-semibold text-gray-900">Account created!</h2>
          <p className="text-sm text-gray-600">
            We&apos;ve sent a 6-digit verification code to{' '}
            <strong>{collectedData.email}</strong>. Please verify your email to continue.
          </p>

          <button onClick={handleGoToVerify} className="btn-primary w-full">
            Verify email
          </button>
        </div>
      )}
    </div>
  );
}
