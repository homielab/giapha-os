"use client";

import { ChevronDown, ChevronUp } from "lucide-react";
import { useState } from "react";

interface CollapsibleSectionProps {
  title: string;
  children: React.ReactNode;
}

export default function CollapsibleSection({
  title,
  children,
}: CollapsibleSectionProps) {
  const [open, setOpen] = useState(false);

  return (
    <div className="border border-stone-200 rounded-2xl overflow-hidden">
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between px-6 py-4 bg-stone-50 hover:bg-stone-100 transition-colors text-left"
      >
        <span className="font-semibold text-stone-700 text-sm">{title}</span>
        {open ? (
          <ChevronUp className="size-4 text-stone-400 shrink-0" />
        ) : (
          <ChevronDown className="size-4 text-stone-400 shrink-0" />
        )}
      </button>
      {open && <div>{children}</div>}
    </div>
  );
}
