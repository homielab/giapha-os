"use client";

import MemberDetailContent from "@/components/MemberDetailContent";
import MemberForm from "@/components/MemberForm";
import { Person } from "@/types";
import { AnimatePresence, motion } from "framer-motion";
import { AlertCircle, ArrowLeft, Edit2, ExternalLink, X } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { useDashboard } from "./DashboardContext";
import { useUser } from "./UserProvider";

export default function MemberDetailModal() {
  const {
    memberModalId: memberId,
    setMemberModalId,
    showCreateMember,
    setShowCreateMember,
  } = useDashboard();
  const { isAdmin, isEditor: canEdit, supabase } = useUser();
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [person, setPerson] = useState<Person | null>(null);
  const [privateData, setPrivateData] = useState<Record<
    string,
    unknown
  > | null>(null);

  const closeModal = () => {
    setMemberModalId(null);
    setShowCreateMember(false);
    setIsEditing(false);
  };

  const fetchData = useCallback(
    async (id: string) => {
      setLoading(true);
      setError(null);
      try {
        // 1. Fetch Person Public Data
        const { data: personData, error: personError } = await supabase
          .from("persons")
          .select("*")
          .eq("id", id)
          .single();

        if (personError || !personData) {
          throw new Error("Không thể tải thông tin thành viên.");
        }
        setPerson(personData);

        // 2. Fetch Private Data if Admin
        if (isAdmin) {
          const { data: privData } = await supabase
            .from("person_details_private")
            .select("*")
            .eq("person_id", id)
            .single();
          setPrivateData(privData || {});
        } else {
          setPrivateData(null);
        }
      } catch (err) {
        console.error("Error fetching member details:", err);
        // @ts-expect-error - err is caught as unknown, but we check for message
        setError(err?.message || "Đã xảy ra lỗi hệ thống.");
      } finally {
        setLoading(false);
      }
    },
    [isAdmin, supabase],
  );

  // Sync state with URL parameter or create mode
  useEffect(() => {
    let timeoutId: NodeJS.Timeout | null = null;

    if (memberId) {
      setIsOpen(true);
      setIsEditing(false); // always start on detail view when opening
      fetchData(memberId);
    } else if (showCreateMember) {
      setIsOpen(true);
      setIsEditing(false);
      setPerson(null);
      setPrivateData(null);
      setError(null);
    } else {
      setIsOpen(false);
      timeoutId = setTimeout(() => {
        setPerson(null);
        setPrivateData(null);
        setError(null);
        setIsEditing(false);
      }, 300);
    }

    return () => {
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, [memberId, showCreateMember, fetchData]);

  // Prevent background scrolling when modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "unset";
    }
    return () => {
      document.body.style.overflow = "unset";
    };
  }, [isOpen]);

  // Called by MemberForm after a successful save
  const handleEditSuccess = (savedPersonId: string) => {
    // Clear stale data first so the loading state is shown while refetching
    setIsEditing(false);
    setPerson(null);
    setPrivateData(null);
    fetchData(savedPersonId);
    // Revalidate Next.js server component cache so the dashboard list/members updates
    router.refresh();
  };

  // Called by MemberForm after a successful CREATE
  const handleCreateSuccess = (savedPersonId: string) => {
    setShowCreateMember(false);
    // Open the detail modal for the new member
    setMemberModalId(savedPersonId);
    // Delay refresh so React commits state changes first,
    // ensuring the server component re-fetches the updated member list.
    setTimeout(() => {
      router.refresh();
    }, 100);
  };

  // initialData for MemberForm — merge public + private
  const formInitialData = person
    ? { ...person, ...(privateData ?? {}) }
    : undefined;

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="fixed inset-0 z-100 flex items-center justify-center p-4 sm:p-6 bg-stone-900/40 backdrop-blur-sm"
        >
          {/* Click-away backdrop (disabled while editing/creating to avoid accidental close) */}
          {!isEditing && !showCreateMember && (
            <div
              className="absolute inset-0 cursor-pointer"
              onClick={closeModal}
            />
          )}

          {/* Modal Content */}
          <motion.div
            layout
            initial={{ scale: 0.96, opacity: 0, y: 15 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.96, opacity: 0, y: 15 }}
            transition={{ duration: 0.25, ease: "easeOut" }}
            layoutDependency={false}
            className="relative bg-white/95 backdrop-blur-2xl rounded-3xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col border border-stone-200"
          >
            {/* Sticky Header Actions */}
            <div className="absolute top-4 right-4 sm:top-5 sm:right-5 z-20 flex items-center gap-2">
              {isEditing ? (
                /* In edit mode — show back button */
                <button
                  onClick={() => {
                    setIsEditing(false);
                  }}
                  className="flex items-center gap-1.5 px-4 py-2 bg-stone-100/80 text-stone-700 rounded-full hover:bg-stone-200 font-semibold text-sm shadow-sm border border-stone-200/50 transition-colors"
                >
                  <ArrowLeft className="size-4" />
                  <span className="hidden sm:inline">Quay lại</span>
                </button>
              ) : (
                canEdit &&
                person && (
                  <>
                    <Link
                      href={`/dashboard/members/${person.id}`}
                      className="flex items-center gap-1.5 px-4 py-2 bg-amber-100/80 text-amber-800 rounded-full hover:bg-amber-200 font-semibold text-sm shadow-sm border border-amber-200/50 transition-colors"
                    >
                      <ExternalLink className="size-4" />
                      <span className="hidden sm:inline">Xem</span>
                    </Link>
                    <button
                      onClick={() => setIsEditing(true)}
                      className="flex items-center gap-1.5 px-4 py-2 bg-amber-100/80 text-amber-800 rounded-full hover:bg-amber-200 font-semibold text-sm shadow-sm border border-amber-200/50 transition-colors"
                    >
                      <Edit2 className="size-4" />
                      <span className="hidden sm:inline">Chỉnh sửa</span>
                    </button>
                  </>
                )
              )}
              <button
                onClick={closeModal}
                className="size-10 flex items-center justify-center bg-stone-100/80 text-stone-600 rounded-full hover:bg-stone-200 hover:text-stone-900 shadow-sm border border-stone-200/50 transition-colors"
                aria-label="Đóng"
              >
                <X className="size-5" />
              </button>
            </div>

            <AnimatePresence mode="wait">
              {loading ? (
                <motion.div
                  key="loading"
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ duration: 0.2 }}
                  className="flex-1 min-h-[500px] flex items-center justify-center flex-col gap-4"
                >
                  <div className="size-10 border-4 border-amber-600 border-t-transparent rounded-full animate-spin"></div>
                  <p className="text-stone-500 font-medium">Đang tải...</p>
                </motion.div>
              ) : error ? (
                <motion.div
                  key="error"
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ duration: 0.2 }}
                  className="flex-1 min-h-[400px] flex items-center justify-center flex-col gap-4 p-8 text-center"
                >
                  <div className="w-16 h-16 bg-red-50 text-red-500 rounded-full flex items-center justify-center mb-2 shadow-inner">
                    <AlertCircle className="size-8" />
                  </div>
                  <p className="text-red-600 font-medium text-lg">{error}</p>
                  <button
                    onClick={closeModal}
                    className="mt-2 px-6 py-2.5 bg-stone-100 hover:bg-stone-200 text-stone-700 font-semibold rounded-full transition-colors"
                  >
                    Đóng
                  </button>
                </motion.div>
              ) : isEditing && formInitialData ? (
                /* ── EDIT MODE ── */
                <motion.div
                  key="editing"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  transition={{ duration: 0.2 }}
                  className="flex-1 overflow-y-auto custom-scrollbar px-4 sm:px-8 pt-16 pb-8"
                >
                  <h2 className="text-xl font-serif font-bold text-stone-800 mb-6">
                    Chỉnh sửa thành viên
                  </h2>
                  <MemberForm
                    initialData={
                      formInitialData as Parameters<
                        typeof MemberForm
                      >[0]["initialData"]
                    }
                    isEditing={true}
                    isAdmin={isAdmin}
                    onSuccess={handleEditSuccess}
                    onCancel={() => setIsEditing(false)}
                  />
                </motion.div>
              ) : showCreateMember ? (
                /* ── CREATE MODE ── */
                <motion.div
                  key="creating"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  transition={{ duration: 0.2 }}
                  className="flex-1 overflow-y-auto custom-scrollbar px-4 sm:px-8 pt-16 pb-8"
                >
                  <h2 className="text-xl font-serif font-bold text-stone-800 mb-6">
                    Thêm thành viên mới
                  </h2>
                  <MemberForm
                    isAdmin={isAdmin}
                    onSuccess={handleCreateSuccess}
                    onCancel={closeModal}
                  />
                </motion.div>
              ) : person ? (
                /* ── DETAIL MODE ── */
                <motion.div
                  key="details"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  transition={{ duration: 0.3 }}
                  className="flex-1 overflow-y-auto custom-scrollbar"
                >
                  <MemberDetailContent
                    person={person}
                    privateData={privateData}
                    isAdmin={isAdmin}
                    canEdit={canEdit}
                  />
                </motion.div>
              ) : null}
            </AnimatePresence>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
