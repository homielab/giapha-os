"use client";

import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { locales, type Locale } from "@/i18n/routing";

const LOCALE_LABELS: Record<Locale, string> = {
  vi: "Tiếng Việt",
  en: "English",
  zh: "漢字",
};

const LOCALE_FLAGS: Record<Locale, string> = {
  vi: "🇻🇳",
  en: "🇬🇧",
  zh: "🀄",
};

function getCurrentLocale(): Locale {
  if (typeof document === "undefined") return "vi";
  const match = document.cookie
    .split("; ")
    .find((row) => row.startsWith("NEXT_LOCALE="));
  const value = match?.split("=")[1];
  return value && (locales as readonly string[]).includes(value)
    ? (value as Locale)
    : "vi";
}

export default function LanguageSwitcher() {
  const t = useTranslations("common");
  const router = useRouter();
  const [current, setCurrent] = useState<Locale>("vi");
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setCurrent(getCurrentLocale());
  }, []);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  function switchLocale(locale: Locale) {
    // eslint-disable-next-line react-hooks/immutability
    document.cookie = `NEXT_LOCALE=${locale}; path=/; max-age=31536000; SameSite=Lax; Secure`;
    setCurrent(locale);
    setOpen(false);
    router.refresh();
  }

  return (
    <div className="relative" ref={ref} title={t("language")}>
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-full text-sm font-medium text-stone-600 dark:text-stone-300 hover:bg-stone-100 dark:hover:bg-stone-700 transition-colors"
        aria-label={t("language")}
      >
        <span>{LOCALE_FLAGS[current]}</span>
        <span className="hidden sm:inline text-xs">{LOCALE_LABELS[current]}</span>
      </button>

      {open && (
        <div className="absolute right-0 mt-1 w-40 bg-white dark:bg-stone-800 rounded-xl shadow-lg border border-stone-200 dark:border-stone-700 py-1 z-50">
          {locales.map((locale) => (
            <button
              key={locale}
              onClick={() => switchLocale(locale)}
              className={`w-full flex items-center gap-2 px-3 py-2 text-sm transition-colors ${
                locale === current
                  ? "text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-stone-700 font-semibold"
                  : "text-stone-700 dark:text-stone-300 hover:bg-stone-100 dark:hover:bg-stone-700"
              }`}
            >
              <span>{LOCALE_FLAGS[locale]}</span>
              <span>{LOCALE_LABELS[locale]}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
