'use client';

import { useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import OtpInput from '@/components/auth/OtpInput';
import api from '@/lib/api';

function VerifyEmailContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const email = searchParams.get('email') ?? '';
  const [otp, setOtp] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleVerify() {
    if (otp.length < 6) {
      setError('Please enter all 6 digits.');
      return;
    }
    setError('');
    setLoading(true);

    try {
      const response = await api.post<{ message: string }>('/auth/verify-email', { email, otp });
      setSuccess(response.data.message);
      setTimeout(() => router.replace('/login'), 2000);
    } catch (err: unknown) {
      const axiosErr = err as { response?: { data?: { error?: { message?: string } } } };
      setError(axiosErr.response?.data?.error?.message ?? 'Verification failed.');
    } finally {
      setLoading(false);
    }
  }

  async function handleResend() {
    setError('');
    try {
      await api.post('/auth/resend-otp', { email });
      setSuccess('A new code has been sent to your email.');
    } catch {
      setError('Failed to resend code. Please try again.');
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-brand-50 to-blue-100 p-4">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-bold text-brand-700">Axios Pay</h1>
          <p className="mt-2 text-gray-600">Verify your email</p>
        </div>

        <div className="card">
          <div className="mb-6 text-center">
            <p className="text-sm text-gray-600">
              We sent a 6-digit code to{' '}
              <span className="font-semibold text-gray-900">{email}</span>
            </p>
          </div>

          <OtpInput length={6} value={otp} onChange={setOtp} onComplete={handleVerify} />

          {error && (
            <div className="mt-4 rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</div>
          )}
          {success && (
            <div className="mt-4 rounded-lg bg-green-50 p-3 text-sm text-green-700">{success}</div>
          )}

          <button
            onClick={handleVerify}
            disabled={loading || otp.length < 6}
            className="btn-primary mt-6 w-full"
          >
            {loading ? 'Verifying…' : 'Verify email'}
          </button>

          <p className="mt-4 text-center text-sm text-gray-500">
            Didn&apos;t receive the code?{' '}
            <button
              type="button"
              onClick={handleResend}
              className="font-medium text-brand-600 hover:text-brand-700"
            >
              Resend
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}

export default function VerifyEmailPage() {
  return (
    <Suspense>
      <VerifyEmailContent />
    </Suspense>
  );
}
