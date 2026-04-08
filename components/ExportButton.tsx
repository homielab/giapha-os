"use client";

import { AnimatePresence, motion } from "framer-motion";
import { toJpeg, toPng } from "html-to-image";
import jsPDF from "jspdf";
import {
  AlertCircle,
  Download,
  FileImage,
  FileText,
  Loader2,
  X,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";

export default function ExportButton() {
  const [isExporting, setIsExporting] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setShowMenu(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleExport = async (format: "png" | "pdf") => {
    try {
      setIsExporting(true);
      setShowMenu(false);
      setError(null);

      // Add a small delay to allow UI to update (close menu) before capturing
      await new Promise((resolve) => setTimeout(resolve, 100));

      const element = document.getElementById("export-container");
      if (!element) throw new Error("Không tìm thấy vùng dữ liệu để xuất.");

      element.classList.add("exporting");

      const exportOptions = {
        cacheBust: true,
        backgroundColor: "#f5f5f4",
        pixelRatio: 2,
        width: element.scrollWidth,
        height: element.scrollHeight,
        style: {
          transform: "scale(1)",
          transformOrigin: "top left",
          width: `${element.scrollWidth}px`,
          height: `${element.scrollHeight}px`,
        },
      };

      if (format === "png") {
        const url = await toPng(element, exportOptions);
        const a = document.createElement("a");
        a.href = url;
        a.download = `giapha-sodo-${new Date().toISOString().split("T")[0]}.png`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
      } else if (format === "pdf") {
        const imgData = await toJpeg(element, {
          ...exportOptions,
          quality: 0.95,
        });

        // Get the actual width and height of the element to calculate PDF dimensions
        const width = element.scrollWidth;
        const height = element.scrollHeight;

        const pdf = new jsPDF({
          orientation: width > height ? "landscape" : "portrait",
          unit: "px",
          format: [width, height],
        });
        pdf.addImage(imgData, "JPEG", 0, 0, width, height);
        pdf.save(`giapha-sodo-${new Date().toISOString().split("T")[0]}.pdf`);
      }
    } catch (err) {
      console.error("Export error:", err);
      setError("Đã xảy ra lỗi khi xuất file. Vui lòng thử lại.");
      setTimeout(() => setError(null), 5000);
    } finally {
      const element = document.getElementById("export-container");
      if (element) {
        element.classList.remove("exporting");
      }
      setIsExporting(false);
    }
  };

  return (
    <div className="relative" ref={menuRef}>
      <button
        onClick={() => setShowMenu(!showMenu)}
        disabled={isExporting}
        className="btn"
      >
        {isExporting ? (
          <Loader2 className="size-4 shrink-0 animate-spin" />
        ) : (
          <Download className="size-4 shrink-0" />
        )}
        <span className="hidden sm:inline tracking-wide min-w-max">
          {isExporting ? "Đang xuất..." : "Xuất file"}
        </span>
      </button>

      <AnimatePresence>
        {showMenu && !isExporting && (
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.95 }}
            transition={{ duration: 0.15, ease: "easeOut" }}
            className="absolute top-full right-0 sm:right-auto sm:left-0 mt-2 w-48 bg-white/90 backdrop-blur-xl rounded-2xl shadow-xl border border-stone-200/60 py-2 z-50 overflow-hidden"
          >
            <button
              onClick={() => handleExport("png")}
              className="w-full flex items-center gap-3 px-4 py-2.5 text-sm font-medium text-stone-700 hover:text-amber-700 hover:bg-amber-50 transition-colors text-left"
            >
              <FileImage className="size-4" />
              Lưu thành Ảnh (PNG)
            </button>
            <button
              onClick={() => handleExport("pdf")}
              className="w-full flex items-center gap-3 px-4 py-2.5 text-sm font-medium text-stone-700 hover:text-amber-700 hover:bg-amber-50 transition-colors text-left"
            >
              <FileText className="size-4" />
              Lưu thành PDF
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {error && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: -10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: -10 }}
            className="absolute top-full right-0 mt-2 w-64 p-3 bg-red-50 border border-red-200 rounded-lg shadow-lg z-50 flex flex-col gap-1"
          >
            <div className="flex items-start justify-between">
              <div className="flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-red-500 mt-0.5 shrink-0" />
                <span className="text-sm font-medium text-red-800 leading-snug">
                  {error}
                </span>
              </div>
              <button
                onClick={() => setError(null)}
                className="text-red-400 hover:text-red-600 transition-colors shrink-0"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
