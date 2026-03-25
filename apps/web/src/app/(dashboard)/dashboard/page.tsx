'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import api from '@/lib/api';
import { useAuthStore } from '@/store/auth.store';
import { CURRENCY_SYMBOLS } from '@axios-pay/types';
import type { Wallet, Transaction } from '@axios-pay/types';

function WalletCard({ wallet }: { wallet: Wallet }) {
  const symbol = CURRENCY_SYMBOLS[wallet.currency];
  const balance = parseFloat(wallet.balance).toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

  return (
    <div className="card flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-gray-500">{wallet.currency}</span>
        <span className="rounded-full bg-brand-50 px-2.5 py-0.5 text-xs font-medium text-brand-700">
          Active
        </span>
      </div>
      <p className="text-2xl font-bold text-gray-900">
        {symbol} {balance}
      </p>
    </div>
  );
}

function TransactionRow({ tx }: { tx: Transaction }) {
  const isSwap = tx.type === 'SWAP';
  const statusColors: Record<string, string> = {
    COMPLETED: 'text-green-700 bg-green-50',
    PENDING: 'text-yellow-700 bg-yellow-50',
    FAILED: 'text-red-700 bg-red-50',
  };
  const statusClass = statusColors[tx.status] ?? 'text-gray-700 bg-gray-50';

  return (
    <tr className="border-b border-gray-100 last:border-0">
      <td className="py-3 pr-4">
        <span className="text-sm font-medium text-gray-900">
          {isSwap
            ? `${tx.fromCurrency} → ${tx.toCurrency}`
            : tx.type.charAt(0) + tx.type.slice(1).toLowerCase()}
        </span>
        <p className="text-xs text-gray-500">{new Date(tx.createdAt).toLocaleString()}</p>
      </td>
      <td className="py-3 pr-4 text-sm text-gray-700">
        {tx.fromAmount
          ? `-${parseFloat(tx.fromAmount).toLocaleString()} ${tx.fromCurrency ?? ''}`
          : '—'}
      </td>
      <td className="py-3 pr-4 text-sm text-gray-700">
        {tx.toAmount
          ? `+${parseFloat(tx.toAmount).toLocaleString()} ${tx.toCurrency ?? ''}`
          : '—'}
      </td>
      <td className="py-3">
        <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${statusClass}`}>
          {tx.status}
        </span>
      </td>
    </tr>
  );
}

export default function DashboardPage() {
  const { user } = useAuthStore();
  const [wallets, setWallets] = useState<Wallet[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      try {
        const [walletsRes, txRes] = await Promise.all([
          api.get<{ wallets: Wallet[] }>('/wallets'),
          api.get<{ items: Transaction[] }>('/wallets/transactions?pageSize=10'),
        ]);
        setWallets(walletsRes.data.wallets);
        setTransactions(txRes.data.items);
      } catch (err) {
        console.error('Failed to fetch dashboard data:', err);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, []);

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-brand-600 border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Welcome header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            Welcome back, {user?.firstName}!
          </h1>
          <p className="mt-1 text-gray-500">Here&apos;s your financial overview.</p>
        </div>
        <Link href="/swap" className="btn-primary">
          Swap currencies
        </Link>
      </div>

      {/* Wallet balances */}
      <section>
        <h2 className="mb-4 text-lg font-semibold text-gray-800">Wallets</h2>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
          {wallets.map((wallet) => (
            <WalletCard key={wallet.id} wallet={wallet} />
          ))}
        </div>
      </section>

      {/* Recent transactions */}
      <section>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-800">Recent transactions</h2>
        </div>

        {transactions.length === 0 ? (
          <div className="card flex flex-col items-center gap-3 py-12 text-center">
            <p className="text-gray-500">No transactions yet.</p>
            <Link href="/swap" className="btn-primary text-sm">
              Make your first swap
            </Link>
          </div>
        ) : (
          <div className="card overflow-hidden p-0">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="border-b border-gray-100 bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                      Transaction
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                      From
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                      To
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                      Status
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50 px-4">
                  {transactions.map((tx) => (
                    <TransactionRow key={tx.id} tx={tx} />
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </section>
    </div>
  );
}
