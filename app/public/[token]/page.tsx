import config from "@/app/config";
import { createPublicClient } from "@/utils/supabase/public";
import { timingSafeEqual } from "crypto";
import {
  Calendar,
  Search,
  TreePine,
  User,
  Users,
} from "lucide-react";
import Link from "next/link";

const PAGE_SIZE = 50;

interface PageProps {
  params: Promise<{ token: string }>;
  searchParams: Promise<{ page?: string; q?: string }>;
}

interface PublicPerson {
  id: string;
  full_name: string;
  gender: "male" | "female" | "other";
  birth_year: number | null;
  death_year: number | null;
  is_deceased: boolean;
  is_in_law: boolean;
  generation: number | null;
  birth_order: number | null;
}

function GenderIcon({ gender }: { gender: "male" | "female" | "other" }) {
  if (gender === "male")
    return <span className="text-sky-500" title="Nam">♂</span>;
  if (gender === "female")
    return <span className="text-rose-400" title="Nữ">♀</span>;
  return <User className="size-3.5 text-stone-400" />;
}

export default async function PublicFamilyTreePage({
  params,
  searchParams,
}: PageProps) {
  const { token } = await params;
  const { page: pageParam, q } = await searchParams;
  const page = Math.max(1, parseInt(pageParam ?? "1", 10));

  const supabase = createPublicClient();

  const { data: tokenSetting } = await supabase
    .from("family_settings")
    .select("setting_value")
    .eq("setting_key", "public_share_token")
    .maybeSingle();

  const { data: enabledSetting } = await supabase
    .from("family_settings")
    .select("setting_value")
    .eq("setting_key", "public_share_enabled")
    .maybeSingle();

  const isEnabled = enabledSetting?.setting_value === "true";
  const storedToken = tokenSetting?.setting_value ?? "";
  const isValidToken =
    storedToken.length > 0 &&
    token.length === storedToken.length &&
    timingSafeEqual(Buffer.from(token), Buffer.from(storedToken));

  if (!isEnabled || !isValidToken) {
    return (
      <div className="min-h-screen bg-stone-50 flex flex-col items-center justify-center p-4">
        <div className="max-w-md w-full text-center bg-white rounded-2xl shadow-sm border border-stone-200 p-8">
          <div className="w-14 h-14 bg-stone-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <TreePine className="size-7 text-stone-400" />
          </div>
          <h1 className="text-xl font-serif font-bold text-stone-800 mb-2">
            Liên kết không hợp lệ
          </h1>
          <p className="text-stone-500 text-sm">
            Liên kết này không hợp lệ hoặc đã bị vô hiệu hoá. Vui lòng liên hệ
            quản trị viên để được cấp link mới.
          </p>
        </div>
      </div>
    );
  }

  const from = (page - 1) * PAGE_SIZE;
  const to = from + PAGE_SIZE - 1;

  let query = supabase
    .from("persons")
    .select(
      "id, full_name, gender, birth_year, death_year, is_deceased, is_in_law, generation, birth_order",
      { count: "exact" },
    )
    .order("generation", { ascending: true, nullsFirst: false })
    .order("birth_order", { ascending: true, nullsFirst: false })
    .order("birth_year", { ascending: true, nullsFirst: false });

  if (q?.trim()) {
    query = query.ilike("full_name", `%${q.trim()}%`);
  }

  const { data: persons, count } = await query.range(from, to);

  const totalPages = count ? Math.ceil(count / PAGE_SIZE) : 1;

  return (
    <div className="min-h-screen bg-stone-50 flex flex-col">
      <header className="sticky top-0 z-20 bg-white/90 backdrop-blur border-b border-stone-200">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <TreePine className="size-5 text-amber-600 shrink-0" />
            <h1 className="font-serif font-bold text-stone-800 text-lg">
              {config.siteName}
            </h1>
          </div>
          <div className="flex items-center gap-1.5 text-xs text-stone-400">
            <Users className="size-3.5" />
            <span>{count ?? 0} thành viên</span>
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-4xl mx-auto w-full px-4 sm:px-6 py-6 space-y-4">
        <form method="get" className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-stone-400 pointer-events-none" />
          <input
            type="search"
            name="q"
            defaultValue={q}
            placeholder="Tìm kiếm theo tên…"
            className="w-full pl-9 pr-4 py-2.5 text-sm rounded-xl border border-stone-200 bg-white shadow-sm focus:outline-none focus:ring-2 focus:ring-amber-400 focus:border-transparent"
          />
          {q && (
            <Link
              href="?"
              className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-stone-400 hover:text-stone-600"
            >
              Xoá
            </Link>
          )}
        </form>

        {q && (
          <p className="text-sm text-stone-500">
            Kết quả cho &ldquo;<strong>{q}</strong>&rdquo;: {count ?? 0} người
          </p>
        )}

        <div className="bg-white rounded-2xl border border-stone-200 shadow-sm overflow-hidden">
          {persons && persons.length > 0 ? (
            <ul className="divide-y divide-stone-100">
              {(persons as PublicPerson[]).map((person) => (
                <li
                  key={person.id}
                  className="flex items-center gap-3 px-4 py-3 hover:bg-stone-50 transition-colors"
                >
                  <div className="w-8 h-8 rounded-full bg-stone-100 flex items-center justify-center shrink-0 text-lg">
                    <GenderIcon gender={person.gender} />
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span
                        className={`font-medium text-stone-900 truncate ${person.is_deceased ? "line-through text-stone-400" : ""}`}
                      >
                        {person.full_name}
                      </span>
                      {person.is_in_law && (
                        <span className="text-xs bg-purple-50 text-purple-600 border border-purple-100 px-1.5 py-0.5 rounded-full">
                          Dâu/Rể
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-3 text-xs text-stone-400 mt-0.5">
                      {(person.birth_year || person.death_year) && (
                        <span className="flex items-center gap-1">
                          <Calendar className="size-3" />
                          {person.birth_year ?? "?"}
                          {person.is_deceased && ` – ${person.death_year ?? "?"}`}
                        </span>
                      )}
                      {person.generation && (
                        <span>Đời {person.generation}</span>
                      )}
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <div className="text-center py-12 text-stone-400">
              <Users className="size-10 mx-auto mb-3 opacity-40" />
              <p className="text-sm">Không tìm thấy thành viên nào.</p>
            </div>
          )}
        </div>

        {totalPages > 1 && (
          <nav className="flex items-center justify-center gap-2">
            {page > 1 && (
              <Link
                href={`?${new URLSearchParams({ ...(q ? { q } : {}), page: String(page - 1) })}`}
                className="px-4 py-2 text-sm rounded-xl border border-stone-200 bg-white hover:bg-stone-50 transition-colors"
              >
                ← Trước
              </Link>
            )}
            <span className="text-sm text-stone-500">
              Trang {page} / {totalPages}
            </span>
            {page < totalPages && (
              <Link
                href={`?${new URLSearchParams({ ...(q ? { q } : {}), page: String(page + 1) })}`}
                className="px-4 py-2 text-sm rounded-xl border border-stone-200 bg-white hover:bg-stone-50 transition-colors"
              >
                Tiếp →
              </Link>
            )}
          </nav>
        )}
      </main>

      <footer className="border-t border-stone-200 bg-white py-4 text-center text-xs text-stone-400">
        {config.siteName} · Chế độ xem công khai
      </footer>
    </div>
  );
}
