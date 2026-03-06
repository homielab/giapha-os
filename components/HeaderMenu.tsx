"use client";

import { AnimatePresence, motion } from "framer-motion";
import { ChevronDown, GitCommitVertical, History, Info, Network, Settings, UserCircle } from "lucide-react";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import LogoutButton from "./LogoutButton";
import { useUser } from "./UserProvider";

export default function HeaderMenu() {
  const { user, isAdmin } = useUser();
  const userEmail = user?.email;
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div className="relative" ref={menuRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 pl-2 pr-4 py-1.5 rounded-full hover:bg-stone-100 transition-all duration-200 border border-transparent hover:border-stone-200"
      >
        <div className="size-8 rounded-full bg-linear-to-br from-amber-200 to-amber-100 text-amber-800 flex items-center justify-center font-bold shadow-sm ring-1 ring-amber-300/50">
          {userEmail ? (
            userEmail.charAt(0).toUpperCase()
          ) : (
            <UserCircle className="size-5" />
          )}
        </div>
        <ChevronDown
          className={`size-4 text-stone-500 transition-transform duration-300 ${isOpen ? "rotate-180" : ""}`}
        />
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.95 }}
            transition={{ duration: 0.15, ease: "easeOut" }}
            className="absolute right-0 mt-2 w-56 bg-white dark:bg-stone-800 rounded-2xl shadow-xl border border-stone-200/60 dark:border-stone-700 py-2 z-50 overflow-hidden"
          >
            <div className="px-4 py-3 border-b border-stone-100 dark:border-stone-700 bg-stone-50/50 dark:bg-stone-900/50">
              <p className="text-xs font-semibold text-stone-400 dark:text-stone-500 uppercase tracking-wider mb-0.5">
                Tài khoản
              </p>
              <p className="text-sm font-medium text-stone-900 dark:text-stone-100 truncate">
                {userEmail}
              </p>
            </div>

            <div className="py-1">
              <Link
                href="/dashboard"
                onClick={() => setIsOpen(false)}
                className="flex items-center gap-2 px-4 py-2.5 text-sm font-medium text-stone-700 dark:text-stone-300 hover:text-amber-700 hover:bg-amber-50 dark:hover:bg-stone-700 transition-colors"
              >
                <Network className="size-4" />
                Bảng điều khiển
              </Link>

              <Link
                href="/dashboard/timeline"
                onClick={() => setIsOpen(false)}
                className="flex items-center gap-2 px-4 py-2.5 text-sm font-medium text-stone-700 dark:text-stone-300 hover:text-sky-700 hover:bg-sky-50 dark:hover:bg-stone-700 transition-colors"
              >
                <GitCommitVertical className="size-4" />
                Dòng thời gian
              </Link>

              {isAdmin && (
                <Link
                  href="/dashboard/history"
                  onClick={() => setIsOpen(false)}
                  className="flex items-center gap-2 px-4 py-2.5 text-sm font-medium text-stone-700 dark:text-stone-300 hover:text-violet-700 hover:bg-violet-50 dark:hover:bg-stone-700 transition-colors"
                >
                  <History className="size-4" />
                  Lịch sử
                </Link>
              )}

              {isAdmin && (
                <Link
                  href="/dashboard/settings"
                  onClick={() => setIsOpen(false)}
                  className="flex items-center gap-2 px-4 py-2.5 text-sm font-medium text-stone-700 dark:text-stone-300 hover:text-emerald-700 hover:bg-emerald-50 dark:hover:bg-stone-700 transition-colors"
                >
                  <Settings className="size-4" />
                  Cài đặt
                </Link>
              )}

              <Link
                href="/about"
                onClick={() => setIsOpen(false)}
                className="flex items-center gap-2 px-4 py-2.5 text-sm font-medium text-stone-700 dark:text-stone-300 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-stone-700 transition-colors"
              >
                <Info className="size-4" />
                Giới thiệu
              </Link>

              <LogoutButton />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
