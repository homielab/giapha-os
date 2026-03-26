import config from "@/app/config";
import HeaderMenu from "@/components/HeaderMenu";
import Image from "next/image";
import Link from "next/link";

import { SiteSettings } from "@/types";

export default function DashboardHeader({ settings }: { settings?: SiteSettings | null }) {
  const siteName = settings?.site_name || config.siteName;
  const logoUrl = settings?.logo_url || "/icon.png";

  return (
    <header className="sticky top-0 z-30 bg-white/80 border-b border-stone-200 shadow-sm transition-all duration-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link
            href="/dashboard"
            className="group flex items-center gap-2 sm:gap-3"
          >
            <div className="relative size-8 rounded-lg overflow-hidden shrink-0 border border-stone-200/50 transition-all bg-stone-50">
              <Image
                src={logoUrl}
                alt={siteName}
                fill
                unoptimized
                className="object-contain"
                sizes="32px"
              />
            </div>
            <h1 className="text-xl sm:text-2xl font-serif font-bold text-stone-800 group-hover:text-amber-700 transition-colors">
              {siteName}
            </h1>
          </Link>
        </div>
        <div className="flex items-center gap-4">
          <HeaderMenu />
        </div>
      </div>
    </header>
  );
}
