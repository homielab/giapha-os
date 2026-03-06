import { getSupabase } from "@/utils/supabase/queries";
import type { Person } from "@/types";
import MapViewWrapper from "@/components/MapViewWrapper";

export default async function MapPage() {
  const supabase = await getSupabase();

  const [withLocationRes, withoutLocationRes] = await Promise.all([
    supabase
      .from("persons")
      .select("*")
      .not("place_of_birth", "is", null)
      .order("full_name", { ascending: true }),
    supabase
      .from("persons")
      .select("*")
      .is("place_of_birth", null)
      .order("full_name", { ascending: true }),
  ]);

  const withLocation: Person[] = withLocationRes.data ?? [];
  const withoutLocation: Person[] = withoutLocationRes.data ?? [];

  return (
    <div className="flex h-[calc(100vh-64px)] gap-4 p-4 overflow-hidden">
      {/* Sidebar */}
      <aside className="w-72 shrink-0 flex flex-col bg-white dark:bg-stone-800 rounded-2xl shadow-sm border border-stone-200/60 dark:border-stone-700 overflow-hidden">
        <div className="px-4 py-3 border-b border-stone-100 dark:border-stone-700 bg-stone-50/50 dark:bg-stone-900/50">
          <h2 className="text-sm font-semibold text-stone-700 dark:text-stone-300">
            Danh sách thành viên
          </h2>
        </div>

        {/* Tab: with location */}
        <div className="flex-1 overflow-y-auto">
          <div className="px-4 py-2 bg-amber-50 dark:bg-amber-900/20 border-b border-amber-100 dark:border-amber-800/30 sticky top-0">
            <p className="text-xs font-semibold text-amber-700 dark:text-amber-400 uppercase tracking-wider">
              📍 Có vị trí ({withLocation.length})
            </p>
          </div>
          <ul className="divide-y divide-stone-100 dark:divide-stone-700">
            {withLocation.map((person) => (
              <li key={person.id} className="px-4 py-2.5">
                <p className="text-sm font-medium text-stone-800 dark:text-stone-200 truncate">
                  {person.full_name}
                </p>
                <p className="text-xs text-stone-400 truncate">{person.place_of_birth}</p>
              </li>
            ))}
            {withLocation.length === 0 && (
              <li className="px-4 py-4 text-xs text-stone-400 italic text-center">
                Chưa có thành viên nào
              </li>
            )}
          </ul>

          {/* Tab: without location */}
          <div className="px-4 py-2 bg-stone-50 dark:bg-stone-900/40 border-y border-stone-100 dark:border-stone-700 sticky top-0">
            <p className="text-xs font-semibold text-stone-500 dark:text-stone-400 uppercase tracking-wider">
              ❓ Chưa có vị trí ({withoutLocation.length})
            </p>
          </div>
          <ul className="divide-y divide-stone-100 dark:divide-stone-700">
            {withoutLocation.map((person) => (
              <li key={person.id} className="px-4 py-2.5">
                <p className="text-sm font-medium text-stone-700 dark:text-stone-300 truncate">
                  {person.full_name}
                </p>
                {person.birth_year && (
                  <p className="text-xs text-stone-400">Sinh: {person.birth_year}</p>
                )}
              </li>
            ))}
            {withoutLocation.length === 0 && (
              <li className="px-4 py-4 text-xs text-stone-400 italic text-center">
                Tất cả thành viên đã có vị trí
              </li>
            )}
          </ul>
        </div>
      </aside>

      {/* Map */}
      <main className="flex-1 min-w-0 flex flex-col">
        <div className="mb-3">
          <h1 className="text-xl font-bold text-stone-800 dark:text-stone-100">
            🗺️ Bản đồ gia phả
          </h1>
          <p className="text-sm text-stone-500 dark:text-stone-400 mt-0.5">
            Hiển thị nơi sinh của các thành viên trên bản đồ
          </p>
        </div>
        <div className="flex-1">
          <MapViewWrapper persons={withLocation} />
        </div>
      </main>
    </div>
  );
}
