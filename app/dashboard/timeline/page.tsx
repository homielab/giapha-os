import { getSupabase } from "@/utils/supabase/queries";
import { redirect } from "next/navigation";
import { getUser } from "@/utils/supabase/queries";
import TimelineList, { TimelineEvent } from "@/components/TimelineList";
import { GitCommitVertical } from "lucide-react";

export default async function TimelinePage() {
  const user = await getUser();
  if (!user) redirect("/login");

  const supabase = await getSupabase();

  const [{ data: persons }, { data: customEvents }] = await Promise.all([
    supabase
      .from("persons")
      .select(
        "id, full_name, gender, birth_year, birth_month, birth_day, death_year, death_month, death_day, generation, avatar_url, is_deceased"
      )
      .order("birth_year", { ascending: true }),
    supabase
      .from("events")
      .select("id, title, event_date, event_type, person_id")
      .order("event_date", { ascending: true }),
  ]);

  const events: TimelineEvent[] = [];

  // Births
  for (const p of persons ?? []) {
    if (p.birth_year == null) continue;
    events.push({
      year: p.birth_year,
      month: p.birth_month ?? undefined,
      day: p.birth_day ?? undefined,
      type: "birth",
      personId: p.id,
      personName: p.full_name,
      detail: "Năm sinh",
      generation: p.generation ?? undefined,
    });
  }

  // Deaths
  for (const p of persons ?? []) {
    if (!p.is_deceased || p.death_year == null) continue;
    events.push({
      year: p.death_year,
      month: p.death_month ?? undefined,
      day: p.death_day ?? undefined,
      type: "death",
      personId: p.id,
      personName: p.full_name,
      detail: "Năm mất",
      generation: p.generation ?? undefined,
    });
  }

  // Custom events
  for (const ce of customEvents ?? []) {
    if (!ce.event_date) continue;
    const year = new Date(ce.event_date).getFullYear();
    if (!year) continue;
    const d = new Date(ce.event_date);
    events.push({
      year,
      month: d.getMonth() + 1,
      day: d.getDate(),
      type: "event",
      personId: ce.person_id ?? undefined,
      title: ce.title,
      detail: ce.event_type ?? undefined,
    });
  }

  // Sort by year ascending overall (TimelineList will group by decade)
  events.sort((a, b) => a.year - b.year);

  // Collect unique generations for the filter dropdown
  const generations = Array.from(
    new Set(
      (persons ?? [])
        .map((p) => p.generation)
        .filter((g): g is number => g != null)
    )
  ).sort((a, b) => a - b);

  return (
    <main className="flex-1 overflow-auto bg-stone-50/50 flex flex-col pt-8 relative w-full">
      <div className="max-w-4xl mx-auto px-4 pb-8 sm:px-6 lg:px-8 w-full relative z-10">
        {/* Header */}
        <div className="mb-8">
          <h1 className="title flex items-center gap-2">
            <GitCommitVertical className="size-6 text-stone-600" />
            Dòng Thời Gian Gia Đình
          </h1>
          <p className="text-stone-500 mt-2 text-sm sm:text-base">
            Toàn bộ các sự kiện quan trọng trong gia đình theo trình tự thời gian.
          </p>
        </div>

        <TimelineList events={events} generations={generations} />
      </div>
    </main>
  );
}
