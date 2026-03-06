"use client";

import config from "@/app/config";
import { useTheme } from "@/components/ThemeProvider";
import GlobalSearch from "@/components/GlobalSearch";
import HeaderMenu from "@/components/HeaderMenu";
import LanguageSwitcher from "@/components/LanguageSwitcher";
import { useTranslations } from "next-intl";
import Image from "next/image";
import Link from "next/link";
import { Moon, Sun } from "lucide-react";

export default function DashboardHeader() {
  const { theme, toggle } = useTheme();
  const t = useTranslations("common");

  return (
    <header className="sticky top-0 z-30 bg-white/80 dark:bg-stone-900/95 border-b border-stone-200 dark:border-stone-700 shadow-sm transition-all duration-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Link
            href="/dashboard"
            className="group flex items-center gap-2 sm:gap-3"
          >
            <div className="relative size-8 rounded-lg overflow-hidden shrink-0 border border-stone-200/50 transition-all">
              <Image
                src="/icon.png"
                alt="Logo"
                fill
                className="object-contain"
                sizes="32px"
              />
            </div>
            <h1 className="text-xl sm:text-2xl font-serif font-bold text-stone-800 dark:text-stone-100 group-hover:text-amber-700 dark:group-hover:text-amber-400 transition-colors">
              {config.siteName}
            </h1>
          </Link>
        </div>
        <div className="flex items-center gap-3">
          <GlobalSearch />
          <LanguageSwitcher />
          <button
            onClick={toggle}
            title={theme === "dark" ? t("lightMode") : t("darkMode")}
            className="p-2 rounded-full hover:bg-stone-100 dark:hover:bg-stone-700 text-stone-500 dark:text-stone-400 transition-colors"
          >
            {theme === "dark" ? (
              <Sun className="size-5" />
            ) : (
              <Moon className="size-5" />
            )}
          </button>
          <HeaderMenu />
        </div>
      </div>
    </header>
  );
}
