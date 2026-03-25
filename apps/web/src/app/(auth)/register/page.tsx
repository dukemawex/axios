'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/auth.store';
import RegisterForm from '@/components/auth/RegisterForm';

export default function RegisterPage() {
  const router = useRouter();
  const { accessToken, isHydrated } = useAuthStore();

  useEffect(() => {
    if (isHydrated && accessToken) {
      router.replace('/dashboard');
    }
  }, [accessToken, isHydrated, router]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-brand-50 to-blue-100 p-4">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-bold text-brand-700">Axios Pay</h1>
          <p className="mt-2 text-gray-600">African cross-border currency swaps</p>
        </div>
        <RegisterForm />
      </div>
    </div>
  );
}
