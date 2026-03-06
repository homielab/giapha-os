"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Menu, X, TreeDeciduous, LogIn, Home, Info, BookOpen } from "lucide-react";

interface PublicHeaderProps {
  siteName: string;
}

export default function PublicHeader({ siteName }: PublicHeaderProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handler = () => setScrolled(window.scrollY > 10);
    window.addEventListener("scroll", handler, { passive: true });
    return () => window.removeEventListener("scroll", handler);
  }, []);

  const navLinks = [
    { href: "/", label: "Trang chủ", icon: Home },
    { href: "/about", label: "Giới thiệu", icon: Info },
    { href: "/login", label: "Đăng nhập", icon: LogIn, primary: true },
  ];

  return (
    <header
      className={`sticky top-0 z-50 transition-all duration-300 ${
        scrolled
          ? "bg-white/95 backdrop-blur-md border-b border-stone-200/80 shadow-sm"
          : "bg-transparent"
      }`}
    >
      <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-4">
        {/* Logo */}
        <Link
          href="/"
          className="flex items-center gap-2.5 group shrink-0"
          onClick={() => setMenuOpen(false)}
        >
          <div className="size-9 rounded-xl bg-amber-500 flex items-center justify-center shadow-sm group-hover:bg-amber-600 transition-colors">
            <TreeDeciduous className="size-5 text-white" />
          </div>
          <span className="font-bold text-stone-800 font-serif text-lg leading-tight group-hover:text-amber-700 transition-colors hidden sm:block">
            {siteName}
          </span>
        </Link>

        {/* Desktop nav */}
        <nav className="hidden md:flex items-center gap-1">
          {navLinks.map(({ href, label, icon: Icon, primary }) =>
            primary ? (
              <Link
                key={href}
                href={href}
                className="ml-2 inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-white text-sm font-semibold transition-all duration-200 shadow-sm hover:shadow-amber-200 hover:-translate-y-0.5"
              >
                <Icon className="size-4" />
                {label}
              </Link>
            ) : (
              <Link
                key={href}
                href={href}
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-stone-600 hover:text-amber-700 hover:bg-amber-50 text-sm font-medium transition-all duration-150"
              >
                <Icon className="size-4 opacity-70" />
                {label}
              </Link>
            )
          )}
        </nav>

        {/* Mobile hamburger */}
        <button
          className="md:hidden p-2 rounded-lg text-stone-600 hover:bg-stone-100 transition-colors"
          onClick={() => setMenuOpen(!menuOpen)}
          aria-label="Menu"
        >
          {menuOpen ? <X className="size-5" /> : <Menu className="size-5" />}
        </button>
      </div>

      {/* Mobile menu */}
      {menuOpen && (
        <div className="md:hidden bg-white border-b border-stone-200 px-4 pb-4 space-y-1 shadow-lg">
          {navLinks.map(({ href, label, icon: Icon, primary }) => (
            <Link
              key={href}
              href={href}
              onClick={() => setMenuOpen(false)}
              className={`flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
                primary
                  ? "bg-amber-500 text-white hover:bg-amber-600"
                  : "text-stone-700 hover:bg-stone-50 hover:text-amber-700"
              }`}
            >
              <Icon className="size-4" />
              {label}
            </Link>
          ))}
        </div>
      )}
    </header>
  );
}
