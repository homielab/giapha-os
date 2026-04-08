"use client";

import { exportData, importData } from "@/app/actions/data";
import { Person } from "@/types";
import { AnimatePresence, motion } from "framer-motion";
import { AlertTriangle, CheckCircle2, Download, Upload } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import PersonSelector from "./PersonSelector";

export default function DataImportExport() {
  const [isExporting, setIsExporting] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [importStatus, setImportStatus] = useState<{
    type: "success" | "error";
    message: string | undefined;
  } | null>(null);
  const [showConfirm, setShowConfirm] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [exportError, setExportError] = useState<string | null>(null);

  const [persons, setPersons] = useState<Person[]>([]);
  const [exportRootId, setExportRootId] = useState<string | null>(null);

  useEffect(() => {
    async function fetchPersons() {
      try {
        const { createClient } = await import("@/utils/supabase/client");
        const supabase = createClient();
        const { data } = await supabase
          .from("persons")
          .select("id, full_name, birth_year, gender, avatar_url, generation")
          .order("birth_year", { ascending: true, nullsFirst: false });
        if (data) setPersons(data as Person[]);
      } catch (err) {
        console.error("Error fetching persons:", err);
      }
    }
    fetchPersons();
  }, []);

  const handleExport = async (format: "json" | "gedcom" | "csv") => {
    try {
      setIsExporting(true);
      const rootParam = exportRootId || undefined;
      const data = await exportData(rootParam);

      if ("error" in data) {
        setExportError(data.error);
        setTimeout(() => setExportError(null), 5000);
        return;
      }

      if (format === "csv") {
        const { exportToCsvZip } = await import("@/utils/csv");
        // @ts-expect-error: BackupPayload relationships type mismatch with Partial<Relationship>
        const zipBlob = await exportToCsvZip(data);
        const url = URL.createObjectURL(zipBlob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `giapha-export-${new Date().toISOString().split("T")[0]}.zip`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        return;
      }

      let content = "";
      let type = "";
      let extension = "";

      if (format === "json") {
        content = JSON.stringify(data, null, 2);
        type = "application/json";
        extension = "json";
      } else {
        const { exportToGedcom } = await import("@/utils/gedcom");
        content = exportToGedcom(data);
        type = "text/plain";
        extension = "ged";
      }

      const blob = new Blob([content], { type });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `giapha-export-${new Date().toISOString().split("T")[0]}.${extension}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error: unknown) {
      setExportError(
        error instanceof Error ? error.message : "Tải xuống thất bại.",
      );
      setTimeout(() => setExportError(null), 5000);
    } finally {
      setIsExporting(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const fileName = file.name.toLowerCase();
      if (fileName.endsWith(".csv")) {
        setImportStatus({
          type: "error",
          message:
            "Vui lòng phục hồi bằng file .zip được tạo ra từ chức năng Xuất CSV.",
        });
        return;
      }

      if (
        !fileName.endsWith(".json") &&
        !fileName.endsWith(".ged") &&
        !fileName.endsWith(".zip")
      ) {
        setImportStatus({
          type: "error",
          message: "Vui lòng chọn file .json, .ged, hoặc .zip hợp lệ.",
        });
        return;
      }
      setSelectedFile(file);
      setShowConfirm(true);
      setImportStatus(null);
    }
  };

  const handleConfirmImport = async () => {
    if (!selectedFile) return;

    try {
      setIsImporting(true);
      setImportStatus(null);

      const fileText = await selectedFile.text();
      let payload;

      if (selectedFile.name.toLowerCase().endsWith(".ged")) {
        const { parseGedcom } = await import("@/utils/gedcom");
        payload = parseGedcom(fileText);
      } else if (selectedFile.name.toLowerCase().endsWith(".zip")) {
        const { parseCsvZip } = await import("@/utils/csv");
        payload = await parseCsvZip(selectedFile);
      } else {
        payload = JSON.parse(fileText);
      }

      if (!payload.persons || !payload.relationships) {
        throw new Error(
          "File không chứa cấu trúc dữ liệu hợp lệ (thiếu persons hoặc relationships).",
        );
      }

      const result = await importData({
        persons: payload.persons,
        relationships: payload.relationships,
        person_details_private: payload.person_details_private,
        custom_events: payload.custom_events,
      });

      if ("error" in result) {
        setImportStatus({
          type: "error",
          message: result.error,
        });
        setShowConfirm(false);
        setSelectedFile(null);
        if (fileInputRef.current) fileInputRef.current.value = "";
        return;
      }

      const parts = [
        `${result.imported?.persons} thành viên`,
        `${result.imported?.relationships} quan hệ`,
      ];
      if (result.imported?.person_details_private) {
        parts.push(
          `${result.imported.person_details_private} thông tin riêng tư`,
        );
      }
      if (result.imported?.custom_events) {
        parts.push(`${result.imported.custom_events} sự kiện`);
      }

      setImportStatus({
        type: "success",
        message: `Phục hồi thành công! Đã nhập ${parts.join(", ")}.`,
      });
      setShowConfirm(false);
      setSelectedFile(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
    } catch (error: unknown) {
      setImportStatus({
        type: "error",
        message:
          error instanceof Error
            ? error.message
            : "Quá trình phục hồi đã xảy ra lỗi.",
      });
      setShowConfirm(false);
      setSelectedFile(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
    } finally {
      setIsImporting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Export Card */}
        <div className="bg-white/80 border border-stone-200/60 rounded-2xl p-6 shadow-sm hover:shadow-md transition-shadow relative group">
          {/* Background Decor */}
          <div className="absolute inset-0 overflow-hidden rounded-2xl pointer-events-none">
            <div className="absolute top-0 right-0 w-32 h-32 bg-amber-200/20 rounded-full blur-2xl -mr-16 -mt-16 group-hover:bg-amber-300/30 transition-colors" />
          </div>

          <div className="flex items-start gap-4 mb-4 relative z-10">
            <div className="p-3 bg-stone-100 rounded-xl text-stone-600">
              <Download className="size-6" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-stone-800">
                Sao lưu dữ liệu
              </h3>
              <p className="text-sm text-stone-500 mt-1">
                Tải xuống định dạng file JSON, GEDCOM hoặc CSV (Zip). Chọn một
                điểm gốc bên dưới để chỉ sao lưu nhánh gia đình đó, hoặc chọn
                &quot;Toàn bộ&quot; để xuất toàn bộ cây.
              </p>
            </div>
          </div>

          <div className="mb-4">
            <PersonSelector
              persons={persons}
              selectedId={exportRootId}
              onSelect={setExportRootId}
              label="Điểm gốc (Root) để xuất dữ liệu"
              className="w-full sm:w-80"
              showAllOption={true}
              allOptionLabel="Toàn bộ dữ liệu"
            />
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <button
              onClick={() => handleExport("json")}
              disabled={isExporting}
              className="btn-primary w-full"
            >
              {isExporting ? "Đang xử lý..." : "Xuất JSON"}
            </button>
            <button
              onClick={() => handleExport("gedcom")}
              disabled={isExporting}
              className="btn w-full bg-stone-100 hover:bg-stone-200 text-stone-700 font-medium"
            >
              {isExporting ? "Đang xử lý..." : "Xuất GEDCOM"}
            </button>
            <button
              onClick={() => handleExport("csv")}
              disabled={isExporting}
              className="btn w-full bg-stone-100 hover:bg-stone-200 text-stone-700 font-medium sm:col-span-2 lg:col-span-1"
            >
              {isExporting ? "Đang xử lý..." : "Xuất CSV (Zip)"}
            </button>
          </div>

          <AnimatePresence>
            {exportError && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="mt-4"
              >
                <div className="text-sm text-red-600 bg-red-50 p-3 rounded-lg border border-red-100 flex items-center gap-2 text-left">
                  <AlertTriangle className="w-5 h-5 shrink-0 text-red-500" />
                  <span>{exportError}</span>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Import Card */}
        <div className="bg-white/80 border border-stone-200/60 rounded-2xl p-6 shadow-sm hover:shadow-md transition-shadow relative group">
          {/* Background Decor */}
          <div className="absolute inset-0 overflow-hidden rounded-2xl pointer-events-none">
            <div className="absolute top-0 right-0 w-32 h-32 bg-rose-200/20 rounded-full blur-2xl -mr-16 -mt-16 group-hover:bg-rose-300/30 transition-colors" />
          </div>

          <div className="flex items-start gap-4 mb-4 relative z-10">
            <div className="p-3 bg-rose-50 rounded-xl text-rose-600">
              <Upload className="size-6" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-stone-800">
                Phục hồi dữ liệu
              </h3>
              <p className="text-sm text-stone-500 mt-1">
                Khôi phục cây gia phả từ file đã sao lưu (.json, .ged, hoặc
                .zip).
                <span className="font-semibold text-rose-600 ml-1">
                  Cảnh báo: Tác vụ này sẽ xoá toàn bộ dữ liệu hiện tại!
                </span>
              </p>
            </div>
          </div>

          <input
            type="file"
            accept=".json,.ged,.zip,.csv"
            className="hidden"
            ref={fileInputRef}
            onChange={handleFileChange}
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={isImporting}
            className="btn w-full"
          >
            {isImporting ? "Đang xử lý..." : "Chọn file phục hồi"}
          </button>
        </div>
      </div>

      {/* Confirmation Modal */}
      <AnimatePresence>
        {showConfirm && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-stone-900/40 backdrop-blur-sm cursor-pointer"
              onClick={() => setShowConfirm(false)}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="bg-white rounded-2xl shadow-xl border border-stone-200/60 p-6 w-full max-w-md relative z-10"
            >
              <div className="flex items-start gap-4 mb-5">
                <div className="p-3 bg-rose-100/50 rounded-full text-rose-600 shrink-0 mt-1">
                  <AlertTriangle className="size-6" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-stone-800">
                    Xác nhận phục hồi
                  </h3>
                  <p className="text-sm text-stone-600 mt-2 leading-relaxed">
                    Hệ thống sẽ xoá{" "}
                    <b>toàn bộ dữ liệu thành viên, mối quan hệ, thông tin riêng tư và sự kiện hiện tại</b> để
                    thay thế bằng dữ liệu từ file{" "}
                    <span className="font-mono text-xs bg-stone-100 px-1 rounded">
                      {selectedFile?.name}
                    </span>
                    .
                  </p>
                  <p className="text-sm text-rose-600 font-semibold mt-2">
                    Hành động này không thể hoàn tác. Bạn đã chắc chắn?
                  </p>
                </div>
              </div>

              <div className="flex justify-end gap-3 mt-6">
                <button
                  onClick={() => setShowConfirm(false)}
                  disabled={isImporting}
                  className="px-4 py-2 text-sm font-medium text-stone-600 hover:text-stone-900 bg-stone-100 hover:bg-stone-200 rounded-xl transition-colors"
                >
                  Huỷ bỏ
                </button>
                <button
                  onClick={handleConfirmImport}
                  disabled={isImporting}
                  className="px-4 py-2 text-sm font-semibold text-white bg-rose-600 hover:bg-rose-700 rounded-xl transition-colors shadow-sm disabled:opacity-50"
                >
                  {isImporting ? "Đang phục hồi..." : "Vẫn tiếp tục"}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Status messages */}
      <AnimatePresence>
        {importStatus && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className={`p-4 rounded-xl flex items-center gap-3 border ${
              importStatus.type === "success"
                ? "bg-emerald-50 border-emerald-200 text-emerald-800"
                : "bg-rose-50 border-rose-200 text-rose-800"
            }`}
          >
            {importStatus.type === "success" ? (
              <CheckCircle2 className="size-5 shrink-0" />
            ) : (
              <AlertTriangle className="size-5 shrink-0" />
            )}
            <p className="text-sm font-medium">{importStatus.message}</p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
