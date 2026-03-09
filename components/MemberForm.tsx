"use client";

import { Gender, Person } from "@/types";
import { createClient } from "@/utils/supabase/client";
import { AnimatePresence, motion, Variants } from "framer-motion";
import {
  AlertCircle,
  Briefcase,
  Image as ImageIcon,
  Loader2,
  Lock,
  MapPin,
  Phone,
  Settings2,
  Trash2,
  User,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

interface MemberFormProps {
  initialData?: Person;
  isEditing?: boolean;
  canEditPrivate?: boolean;
  /** Called with the saved person's ID after a successful save. Overrides default router.push. */
  onSuccess?: (personId: string) => void;
  /** Called when user clicks Cancel. Overrides default router.back(). */
  onCancel?: () => void;
}

export default function MemberForm({
  initialData,
  isEditing = false,
  canEditPrivate = false,
  onSuccess,
  onCancel,
}: MemberFormProps) {
  const router = useRouter();
  const supabase = createClient();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form states
  const [fullName, setFullName] = useState(initialData?.full_name || "");
  const [otherNames, setOtherNames] = useState(initialData?.other_names || "");
  const [gender, setGender] = useState<Gender>(initialData?.gender || "male");
  const [birthYear, setBirthYear] = useState<number | "">(
    initialData?.birth_year || "",
  );
  const [birthMonth, setBirthMonth] = useState<number | "">(
    initialData?.birth_month || "",
  );
  const [birthDay, setBirthDay] = useState<number | "">(
    initialData?.birth_day || "",
  );

  const [deathYear, setDeathYear] = useState<number | "">(
    initialData?.death_year || "",
  );
  const [deathMonth, setDeathMonth] = useState<number | "">(
    initialData?.death_month || "",
  );
  const [deathDay, setDeathDay] = useState<number | "">(
    initialData?.death_day || "",
  );

  const [isDeceased, setIsDeceased] = useState<boolean>(
    initialData?.is_deceased || false,
  );
  const [isInLaw, setIsInLaw] = useState<boolean>(
    initialData?.is_in_law || false,
  );

  const [birthOrder, setBirthOrder] = useState<number | "">(
    initialData?.birth_order || "",
  );
  const [generation, setGeneration] = useState<number | "">(
    initialData?.generation || "",
  );

  const [avatarUrl, setAvatarUrl] = useState(initialData?.avatar_url || "");
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(
    initialData?.avatar_url || null,
  );

  const [note, setNote] = useState(initialData?.note || "");

  // Private fields
  const [phoneNumber, setPhoneNumber] = useState(
    initialData?.phone_number || "",
  );
  const [occupation, setOccupation] = useState(initialData?.occupation || "");
  const [currentResidence, setCurrentResidence] = useState(
    initialData?.current_residence || "",
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    // Validation
    const isValidDate = (
      day: number | "",
      month: number | "",
      year: number | "",
    ) => {
      if (day !== "" && (day < 1 || day > 31)) return false;
      if (month !== "" && (month < 1 || month > 12)) return false;
      if (year !== "" && year < 1) return false;

      if (day !== "" && month !== "") {
        const currentYear = year !== "" ? year : 2000;
        const daysInMonth = new Date(currentYear, month, 0).getDate();
        if (day > daysInMonth) return false;
      }
      return true;
    };

    if (!isValidDate(birthDay, birthMonth, birthYear)) {
      setError("Ngày sinh không hợp lệ. Vui lòng kiểm tra lại.");
      setLoading(false);
      return;
    }

    if (isDeceased && !isValidDate(deathDay, deathMonth, deathYear)) {
      setError("Ngày mất không hợp lệ. Vui lòng kiểm tra lại.");
      setLoading(false);
      return;
    }

    if (
      isDeceased &&
      birthYear !== "" &&
      deathYear !== "" &&
      deathYear < birthYear
    ) {
      setError("Năm mất phải lớn hơn hoặc bằng năm sinh.");
      setLoading(false);
      return;
    }

    try {
      let finalAvatarUrl = avatarUrl;

      // 0. Handle Avatar Upload if a new file is selected
      if (avatarFile) {
        const fileExt = avatarFile.name.split(".").pop();
        const fileName = `${Math.random().toString(36).substring(2, 15)}_${Date.now()}.${fileExt}`;
        const filePath = `${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from("avatars")
          .upload(filePath, avatarFile);

        if (uploadError) throw uploadError;

        const {
          data: { publicUrl },
        } = supabase.storage.from("avatars").getPublicUrl(filePath);

        finalAvatarUrl = publicUrl;
      }

      // 1. Upsert public data
      const personData = {
        full_name: fullName,
        gender,
        birth_year: birthYear === "" ? null : Number(birthYear),
        birth_month: birthMonth === "" ? null : Number(birthMonth),
        birth_day: birthDay === "" ? null : Number(birthDay),
        death_year: isDeceased && deathYear !== "" ? Number(deathYear) : null,
        death_month:
          isDeceased && deathMonth !== "" ? Number(deathMonth) : null,
        death_day: isDeceased && deathDay !== "" ? Number(deathDay) : null,
        is_deceased: isDeceased,
        is_in_law: isInLaw,
        birth_order: birthOrder === "" ? null : Number(birthOrder),
        generation: generation === "" ? null : Number(generation),
        other_names: otherNames || null,
        avatar_url: finalAvatarUrl || null,
        note: note || null,
      };

      let personId = initialData?.id;

      if (isEditing && personId) {
        const { error: updateError } = await supabase
          .from("persons")
          .update(personData)
          .eq("id", personId);
        if (updateError) throw updateError;
      } else {
        const { data: newPerson, error: createError } = await supabase
          .from("persons")
          .insert(personData)
          .select()
          .single();
        if (createError) throw createError;
        personId = newPerson.id;
      }

      // 2. Upsert private data (only if admin and personId exists)
      if (canEditPrivate && personId) {
        const privateData = {
          person_id: personId,
          phone_number: phoneNumber || null,
          occupation: occupation || null,
          current_residence: currentResidence || null,
        };

        const { error: privateError } = await supabase
          .from("person_details_private")
          .upsert(privateData); // Upsert works for both new and existing if we use person_id as unique key

        if (privateError) throw privateError;
      }

      // After save: use callback if provided, otherwise fall back to page navigation
      if (!personId)
        throw new Error("Không lấy được ID thành viên sau khi lưu.");
      if (onSuccess) {
        onSuccess(personId);
      } else {
        router.push("/dashboard/members/" + personId);
        router.refresh();
      }
    } catch (err) {
      console.error("Error saving member:", err);
      setError((err as Error).message || "Failed to save member");
    } finally {
      setLoading(false);
    }
  };

  const formSectionVariants: Variants = {
    hidden: { opacity: 0, y: 10 },
    show: {
      opacity: 1,
      y: 0,
      transition: { type: "spring", stiffness: 300, damping: 24 },
    },
  };

  const inputClasses =
    "bg-white text-stone-900 placeholder-stone-500 block w-full rounded-xl border border-stone-300 shadow-sm focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 focus:bg-white text-sm px-4 py-3 transition-all outline-none!";

  return (
    <form onSubmit={handleSubmit} className="space-y-6 sm:space-y-8">
      <motion.div
        variants={formSectionVariants}
        initial="hidden"
        animate="show"
        className="bg-white/80 p-5 sm:p-8 rounded-2xl shadow-sm border border-stone-200/80"
      >
        <h3 className="text-lg sm:text-xl font-serif font-bold text-stone-800 mb-6 border-b border-stone-100 pb-4 flex items-center gap-2">
          <User className="size-5 text-amber-600" />
          Thông tin chung
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="md:col-span-1">
            <label className="block text-sm font-semibold text-stone-700 mb-1.5">
              Họ và Tên <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              required
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              className={inputClasses}
              placeholder="Nhập họ và tên..."
            />
          </div>

          <div className="md:col-span-1">
            <label className="block text-sm font-semibold text-stone-700 mb-1.5">
              Tên gọi khác
            </label>
            <input
              type="text"
              value={otherNames}
              onChange={(e) => setOtherNames(e.target.value)}
              className={inputClasses}
              placeholder="Nickname, tên thánh, bí danh..."
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-stone-700 mb-1.5">
              Giới tính <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <select
                value={gender}
                onChange={(e) => setGender(e.target.value as Gender)}
                className={`${inputClasses} appearance-none`}
              >
                <option value="male">Nam</option>
                <option value="female">Nữ</option>
                <option value="other">Khác</option>
              </select>
              <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-4 text-stone-500">
                <Settings2 className="size-4" />
              </div>
            </div>
          </div>

          <div className="flex items-center sm:mt-7 mt-2">
            <label className="flex items-center gap-3 group">
              <div className="relative flex items-center">
                <input
                  type="checkbox"
                  checked={isInLaw}
                  onChange={(e) => setIsInLaw(e.target.checked)}
                  className="peer sr-only"
                />
                <div className="size-5 border-2 border-stone-300 rounded peer-checked:bg-amber-500 peer-checked:border-amber-500 transition-colors flex items-center justify-center">
                  <motion.svg
                    initial={false}
                    animate={{
                      opacity: isInLaw ? 1 : 0,
                      scale: isInLaw ? 1 : 0.5,
                    }}
                    className="size-3 text-white pointer-events-none"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={4}
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M5 13l4 4L19 7"
                    />
                  </motion.svg>
                </div>
              </div>
              <span className="text-sm font-semibold text-stone-700 group-hover:text-amber-700 transition-colors">
                Là con Dâu hoặc con Rể
              </span>
            </label>
          </div>

          <div>
            <label className="block text-sm font-semibold text-stone-700 mb-1.5">
              Thứ tự sinh trong gia đình
            </label>
            <input
              type="number"
              min="1"
              placeholder="Ví dụ: 1 (con trưởng), 2 (con thứ hai)..."
              value={birthOrder}
              onChange={(e) =>
                setBirthOrder(e.target.value ? Number(e.target.value) : "")
              }
              className={inputClasses}
            />
            <p className="mt-1.5 text-xs text-stone-400 flex items-center gap-1">
              <span>💡</span> Để trống nếu không rõ
            </p>
          </div>

          <div>
            <label className="block text-sm font-semibold text-stone-700 mb-1.5">
              Thuộc đời thứ
            </label>
            <input
              type="number"
              min="1"
              placeholder="Ví dụ: 1, 2, 3..."
              value={generation}
              onChange={(e) =>
                setGeneration(e.target.value ? Number(e.target.value) : "")
              }
              className={inputClasses}
            />
            <p className="mt-1.5 text-xs text-stone-400 flex items-center gap-1">
              <span>💡</span> Để trống nếu không rõ
            </p>
          </div>

          <div className="md:col-span-2 mt-2">
            <label className="block text-sm font-semibold text-stone-700 mb-2.5">
              Ảnh đại diện
            </label>
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-5 bg-stone-50/50 p-4 rounded-xl border border-stone-100">
              <div
                className={`w-20 h-20 sm:w-24 sm:h-24 rounded-full flex items-center justify-center text-xl font-bold text-white overflow-hidden shrink-0 shadow-md border-4 border-white
                  ${!avatarPreview ? (gender === "male" ? "bg-linear-to-br from-sky-400 to-sky-700" : gender === "female" ? "bg-linear-to-br from-rose-400 to-rose-700" : "bg-linear-to-br from-stone-400 to-stone-600") : ""}`}
              >
                {avatarPreview ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={avatarPreview}
                    alt="Avatar preview"
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <span className="opacity-90">
                    {fullName ? fullName.charAt(0).toUpperCase() : "?"}
                  </span>
                )}
              </div>
              <div className="flex-1 w-full">
                <div className="flex flex-wrap items-center gap-3">
                  <div className="relative">
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          setAvatarFile(file);
                          setAvatarPreview(URL.createObjectURL(file));
                        }
                      }}
                      className="absolute inset-0 w-full h-full opacity-0"
                    />
                    <button
                      type="button"
                      className="flex items-center gap-2 text-sm font-medium px-4 py-2 bg-amber-50 text-amber-700 border border-amber-200/50 hover:bg-amber-100 hover:border-amber-300 transition-colors rounded-lg"
                    >
                      <ImageIcon className="size-4" />
                      Chọn ảnh mới
                    </button>
                  </div>
                  {avatarPreview && (
                    <button
                      type="button"
                      onClick={async () => {
                        // If there is an existing URL from Supabase, try to extract the file path to delete it
                        if (
                          initialData?.avatar_url &&
                          avatarUrl === initialData.avatar_url
                        ) {
                          try {
                            // Extract just the filename from the end of the URL
                            const fileName = initialData.avatar_url
                              .split("/")
                              .pop();
                            if (fileName) {
                              const { error: removeError } =
                                await supabase.storage
                                  .from("avatars")
                                  .remove([fileName]);
                              if (removeError) {
                                console.error(
                                  "Error removing avatar from storage:",
                                  removeError,
                                );
                              }
                            }
                          } catch (err) {
                            console.error(
                              "Failed to parse avatar URL for deletion",
                              err,
                            );
                          }
                        }

                        setAvatarUrl("");
                        setAvatarFile(null);
                        setAvatarPreview(null);
                      }}
                      className="flex items-center gap-2 text-sm text-rose-600 hover:text-rose-700 font-medium px-4 py-2 border border-rose-200 rounded-lg bg-rose-50 hover:bg-rose-100 transition-colors"
                    >
                      <Trash2 className="size-4" />
                      Xóa ảnh
                    </button>
                  )}
                </div>
                <p className="mt-2.5 text-xs text-stone-500 flex items-center gap-1.5">
                  <AlertCircle className="w-3.5 h-3.5 text-stone-400" />
                  Hỗ trợ PNG, JPG, GIF tối đa 2MB.
                </p>
              </div>
            </div>
          </div>

          <div className="md:col-span-2">
            <label className="block text-sm font-semibold text-stone-700 mb-1.5">
              Ngày sinh dương lịch
            </label>
            <div className="grid grid-cols-3 gap-3">
              <input
                type="number"
                placeholder="Ngày"
                min="1"
                max="31"
                value={birthDay}
                onChange={(e) =>
                  setBirthDay(e.target.value ? Number(e.target.value) : "")
                }
                className={inputClasses}
              />
              <input
                type="number"
                placeholder="Tháng"
                min="1"
                max="12"
                value={birthMonth}
                onChange={(e) =>
                  setBirthMonth(e.target.value ? Number(e.target.value) : "")
                }
                className={inputClasses}
              />
              <input
                type="number"
                placeholder="Năm"
                value={birthYear}
                onChange={(e) =>
                  setBirthYear(e.target.value ? Number(e.target.value) : "")
                }
                className={inputClasses}
              />
            </div>
          </div>

          <div className="md:col-span-2 bg-stone-50/50 p-5 rounded-2xl border border-stone-200/60 shadow-xs">
            <div className="flex flex-col gap-4">
              <label className="flex items-center gap-3 group">
                <div className="relative flex items-center">
                  <input
                    type="checkbox"
                    checked={isDeceased}
                    onChange={(e) => {
                      setIsDeceased(e.target.checked);
                      if (!e.target.checked) {
                        setDeathYear("");
                        setDeathMonth("");
                        setDeathDay("");
                      }
                    }}
                    className="peer sr-only"
                  />
                  <div className="size-5 border-2 border-stone-300 rounded peer-checked:bg-stone-600 peer-checked:border-stone-600 transition-colors flex items-center justify-center">
                    <motion.svg
                      initial={false}
                      animate={{
                        opacity: isDeceased ? 1 : 0,
                        scale: isDeceased ? 1 : 0.5,
                      }}
                      className="size-3 text-white pointer-events-none"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth={4}
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M5 13l4 4L19 7"
                      />
                    </motion.svg>
                  </div>
                </div>
                <span className="text-sm font-semibold text-stone-700 group-hover:text-stone-900 transition-colors">
                  Đã qua đời
                </span>
              </label>
            </div>

            <AnimatePresence>
              {isDeceased && (
                <motion.div
                  initial={{ opacity: 0, height: 0, marginTop: 0 }}
                  animate={{ opacity: 1, height: "auto", marginTop: 20 }}
                  exit={{ opacity: 0, height: 0, marginTop: 0 }}
                  className="overflow-hidden"
                >
                  <label className="block text-sm font-semibold text-stone-700 mb-1.5">
                    Ngày mất
                  </label>
                  <div className="grid grid-cols-3 gap-3 pt-1">
                    <input
                      type="number"
                      placeholder="Ngày"
                      min="1"
                      max="31"
                      value={deathDay}
                      onChange={(e) =>
                        setDeathDay(
                          e.target.value ? Number(e.target.value) : "",
                        )
                      }
                      className={inputClasses}
                    />
                    <input
                      type="number"
                      placeholder="Tháng"
                      min="1"
                      max="12"
                      value={deathMonth}
                      onChange={(e) =>
                        setDeathMonth(
                          e.target.value ? Number(e.target.value) : "",
                        )
                      }
                      className={inputClasses}
                    />
                    <input
                      type="number"
                      placeholder="Năm"
                      value={deathYear}
                      onChange={(e) =>
                        setDeathYear(
                          e.target.value ? Number(e.target.value) : "",
                        )
                      }
                      className={inputClasses}
                    />
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <div className="md:col-span-2">
            <label className="block text-sm font-semibold text-stone-700 mb-1.5">
              Ghi chú
            </label>
            <textarea
              rows={3}
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Thêm thông tin bổ sung, tiểu sử..."
              className={`${inputClasses} resize-none`}
            />
          </div>
        </div>
      </motion.div>

      {/* Private Information Section (Admin Only) */}
      {canEditPrivate && (
        <motion.div
          variants={formSectionVariants}
          initial="hidden"
          animate="show"
          transition={{ delay: 0.1 }}
          className="bg-linear-to-br from-amber-50/80 to-stone-50/80 p-5 sm:p-8 rounded-2xl border border-amber-200/50 shadow-sm relative overflow-hidden"
        >
          {/* Decorative Background Icon */}
          <Lock className="absolute -right-6 -bottom-6 w-32 h-32 text-amber-500/5 rotate-12" />

          <h3 className="text-lg sm:text-xl font-serif font-bold text-amber-900 mb-6 border-b border-amber-200/50 pb-4 flex items-center gap-2 relative z-10">
            <span className="bg-amber-100/80 text-amber-700 p-1.5 rounded-lg border border-amber-200/50">
              📋
            </span>
            Thông tin liên hệ
          </h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 relative z-10">
            <div>
              <label className="flex items-center gap-1.5 text-sm font-semibold text-amber-900/80 mb-1.5">
                <Phone className="size-4" /> Số điện thoại
              </label>
              <input
                type="tel"
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value)}
                disabled={isDeceased}
                placeholder="Ví dụ: 0912345678"
                className={`${inputClasses} disabled:bg-stone-100 disabled:text-stone-400 disabled:cursor-not-allowed`}
              />
              {isDeceased && (
                <p className="text-[11px] font-medium text-rose-500 mt-1.5 flex items-center gap-1">
                  <AlertCircle className="size-3" />
                  Không thể nhập SĐT cho người đã mất
                </p>
              )}
            </div>

            <div>
              <label className="flex items-center gap-1.5 text-sm font-semibold text-amber-900/80 mb-1.5">
                <Briefcase className="size-4" /> Nghề nghiệp
              </label>
              <input
                type="text"
                value={occupation}
                onChange={(e) => setOccupation(e.target.value)}
                placeholder="Ví dụ: Kỹ sư, Bác sĩ..."
                className={inputClasses}
              />
            </div>

            <div className="md:col-span-2">
              <label className="flex items-center gap-1.5 text-sm font-semibold text-amber-900/80 mb-1.5">
                <MapPin className="size-4" /> Nơi ở hiện tại
              </label>
              <input
                type="text"
                value={currentResidence}
                onChange={(e) => setCurrentResidence(e.target.value)}
                placeholder="Địa chỉ cư trú..."
                className={inputClasses}
              />
            </div>
          </div>
        </motion.div>
      )}

      <AnimatePresence>
        {error && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="text-rose-700 text-sm font-medium bg-rose-50 border border-rose-200 p-4 rounded-xl flex items-start gap-3 shadow-sm"
          >
            <AlertCircle className="size-5 shrink-0 mt-0.5" />
            <p>{error}</p>
          </motion.div>
        )}
      </AnimatePresence>

      <motion.div
        variants={formSectionVariants}
        initial="hidden"
        animate="show"
        transition={{ delay: 0.2 }}
        className="flex justify-end gap-3 sm:gap-4 pt-6"
      >
        <button
          type="button"
          onClick={() => (onCancel ? onCancel() : router.back())}
          className="btn"
        >
          Hủy bỏ
        </button>
        <button type="submit" disabled={loading} className="btn-primary">
          {loading && <Loader2 className="size-4 animate-spin" />}
          {loading
            ? "Đang lưu..."
            : isEditing
              ? "Lưu thay đổi"
              : "Thêm thành viên"}
        </button>
      </motion.div>
    </form>
  );
}
