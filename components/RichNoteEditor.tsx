"use client";

import { useRef } from "react";

interface RichNoteEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}

export default function RichNoteEditor({
  value,
  onChange,
  placeholder = "Thêm thông tin bổ sung, tiểu sử...",
}: RichNoteEditorProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  function insertAtCursor(before: string, after: string, defaultText: string) {
    const ta = textareaRef.current;
    if (!ta) return;

    const start = ta.selectionStart;
    const end = ta.selectionEnd;
    const selected = value.slice(start, end) || defaultText;
    const newValue =
      value.slice(0, start) + before + selected + after + value.slice(end);
    onChange(newValue);

    requestAnimationFrame(() => {
      ta.focus();
      const cursorPos =
        selected === defaultText
          ? start + before.length
          : start + before.length + selected.length + after.length;
      if (selected === defaultText) {
        ta.setSelectionRange(
          start + before.length,
          start + before.length + defaultText.length
        );
      } else {
        ta.setSelectionRange(cursorPos, cursorPos);
      }
    });
  }

  function insertListItem() {
    const ta = textareaRef.current;
    if (!ta) return;

    const start = ta.selectionStart;
    const lineStart = value.lastIndexOf("\n", start - 1) + 1;
    const prefix = value.slice(lineStart, start).startsWith("- ") ? "" : "- ";

    if (prefix) {
      const newValue = value.slice(0, lineStart) + "- " + value.slice(lineStart);
      onChange(newValue);
      requestAnimationFrame(() => {
        ta.focus();
        ta.setSelectionRange(start + 2, start + 2);
      });
    } else {
      const newValue = value.slice(0, start) + "\n- " + value.slice(start);
      onChange(newValue);
      requestAnimationFrame(() => {
        ta.focus();
        ta.setSelectionRange(start + 3, start + 3);
      });
    }
  }

  const toolbarBtn =
    "px-2.5 py-1 text-sm rounded-lg border border-stone-300 bg-white hover:bg-amber-50 hover:border-amber-400 text-stone-700 transition-colors font-medium leading-none select-none cursor-pointer";

  return (
    <div className="flex flex-col gap-0 rounded-xl border border-stone-300 shadow-sm focus-within:border-amber-500 focus-within:ring-2 focus-within:ring-amber-500/20 bg-white overflow-hidden transition-all">
      {/* Toolbar */}
      <div className="flex items-center gap-1.5 px-3 py-2 border-b border-stone-200 bg-stone-50/80">
        <button
          type="button"
          title="Đậm (Bold)"
          className={toolbarBtn}
          onMouseDown={(e) => {
            e.preventDefault();
            insertAtCursor("**", "**", "văn bản đậm");
          }}
        >
          <strong>B</strong>
        </button>
        <button
          type="button"
          title="Nghiêng (Italic)"
          className={toolbarBtn}
          onMouseDown={(e) => {
            e.preventDefault();
            insertAtCursor("*", "*", "văn bản nghiêng");
          }}
        >
          <em>I</em>
        </button>
        <button
          type="button"
          title="Mục danh sách (List item)"
          className={toolbarBtn}
          onMouseDown={(e) => {
            e.preventDefault();
            insertListItem();
          }}
        >
          • Danh sách
        </button>
        <span className="ml-auto text-[11px] text-stone-400 leading-none">
          Hỗ trợ Markdown
        </span>
      </div>

      {/* Textarea */}
      <textarea
        ref={textareaRef}
        rows={4}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full resize-none bg-white text-stone-900 placeholder-stone-500 text-sm px-4 py-3 outline-none!"
      />

      {/* Footer: character count */}
      <div className="flex justify-end px-3 py-1.5 border-t border-stone-100 bg-stone-50/50">
        <span className="text-[11px] text-stone-400">{value.length} ký tự</span>
      </div>
    </div>
  );
}
