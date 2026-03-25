import SwapWidget from '@/components/swap/SwapWidget';

export default function SwapPage() {
  return (
    <div className="mx-auto max-w-lg">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Swap currencies</h1>
        <p className="mt-1 text-gray-500">
          Exchange African currencies instantly with a 1.5% fee.
        </p>
      </div>
      <SwapWidget />
    </div>
  );
}
