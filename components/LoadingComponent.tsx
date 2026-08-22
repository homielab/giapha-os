import { Loader2 } from "lucide-react";

export default function LoadingComponent() {
  return (
    <main className="max-w-5xl mx-auto flex-1 overflow-auto bg-stone-50/50 flex flex-col items-center justify-center p-4">
      <div className="flex flex-col items-center justify-center space-y-4">
        <div className="relative">
          <div className="absolute inset-0 bg-amber-200/50 rounded-full blur-xl animate-pulse"></div>
          <div className="relative bg-white p-4 rounded-2xl shadow-sm border border-stone-100">
            <Loader2 className="size-8 text-amber-600 animate-spin" />
          </div>
        </div>
        <p className="text-stone-500 font-medium animate-pulse">
          Đang tải dữ liệu gia phả Họ Cao...
        </p>
      </div>
    </main>
  );
}
