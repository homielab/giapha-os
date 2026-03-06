'use client';

import { WifiOff } from 'lucide-react';

export default function OfflinePage() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-4 px-4 text-center">
      <WifiOff className="w-16 h-16 text-amber-600" />
      <h1 className="text-2xl font-semibold">Bạn đang offline</h1>
      <p className="text-stone-500 dark:text-stone-400">
        Vui lòng kiểm tra kết nối mạng và thử lại.
      </p>
      <button
        onClick={() => window.location.reload()}
        className="mt-2 px-6 py-2 rounded-lg bg-amber-600 text-white font-medium hover:bg-amber-700 transition-colors"
      >
        Thử lại
      </button>
    </div>
  );
}
