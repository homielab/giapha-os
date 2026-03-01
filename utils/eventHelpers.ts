import { Lunar, Solar } from "lunar-javascript";

export type EventType = "birthday" | "death_anniversary" | "custom_event";

export interface FamilyEvent {
  personId: string | null;
  personName: string;
  type: EventType;
  /** Solar date of the next occurrence */
  nextOccurrence: Date;
  /** Days until the next occurrence (negative = already passed this year, shown for context) */
  daysUntil: number;
  /** Display label for the date of the event (e.g., "12/03" solar or "05/02 ÂL") */
  eventDateLabel: string;
  /** The actual year of original event (birth year or death year) */
  originYear?: number | null;
  originMonth?: number | null;
  originDay?: number | null;
  /** Whether the person is deceased */
  isDeceased: boolean;
  /** Optional location for the event */
  location?: string | null;
  /** Optional content/description for the event */
  content?: string | null;
}

export interface CustomEventRecord {
  id: string;
  name: string;
  content: string | null;
  event_date: string;
  location: string | null;
  created_by: string | null;
}

/**
 * Finds the next solar Date on which a given lunar (month, day) falls,
 * starting from `fromDate`.
 */
function nextSolarForLunar(
  lunarMonth: number,
  lunarDay: number,
  fromDate: Date,
): Date | null {
  // Derive the current lunar year by converting today's solar date to lunar
  const todaySolar = Solar.fromYmd(
    fromDate.getFullYear(),
    fromDate.getMonth() + 1,
    fromDate.getDate(),
  );
  const currentLunarYear = todaySolar.getLunar().getYear();

  // Try this lunar year and the next two (to handle leap months & edge cases)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const LunarClass = Lunar as any;
  for (let offset = 0; offset <= 2; offset++) {
    try {
      const l = LunarClass.fromYmd(
        currentLunarYear + offset,
        lunarMonth,
        lunarDay,
      );
      const s = l.getSolar();
      const candidate = new Date(s.getYear(), s.getMonth() - 1, s.getDay());
      if (candidate >= fromDate) return candidate;
    } catch {
      // lunar date may not exist in this year (e.g., leap month); try next
    }
  }
  return null;
}

/**
 * Computes upcoming FamilyEvents from a list of persons.
 * - Birthdays use the solar birth_month / birth_day.
 * - Death anniversaries (ngày giỗ) are observed on the *lunar* date of death.
 */
export function computeEvents(
  persons: {
    id: string;
    full_name: string;
    birth_year: number | null;
    birth_month: number | null;
    birth_day: number | null;
    death_year: number | null;
    death_month: number | null;
    death_day: number | null;
    is_deceased: boolean;
  }[],
  customEvents: CustomEventRecord[] = []
): FamilyEvent[] {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const events: FamilyEvent[] = [];

  for (const p of persons) {
    // ── Birthday (solar) ────────────────────────────────────────────
    if (p.birth_month && p.birth_day) {
      const thisYear = today.getFullYear();
      let next = new Date(thisYear, p.birth_month - 1, p.birth_day);
      if (next < today)
        next = new Date(thisYear + 1, p.birth_month - 1, p.birth_day);

      const daysUntil = Math.round(
        (next.getTime() - today.getTime()) / (1000 * 60 * 60 * 24),
      );

      events.push({
        personId: p.id,
        personName: p.full_name,
        type: "birthday",
        nextOccurrence: next,
        daysUntil,
        eventDateLabel: `${p.birth_day.toString().padStart(2, "0")}/${p.birth_month.toString().padStart(2, "0")}`,
        originYear: p.birth_year || null,
        originMonth: p.birth_month,
        originDay: p.birth_day,
        isDeceased: p.is_deceased,
      });
    }

    // ── Death anniversary (lunar) ────────────────────────────────────
    if (p.is_deceased && p.death_month && p.death_day) {
      try {
        // Convert the solar death date to a lunar date
        const deathYear = p.death_year ?? new Date().getFullYear();
        const solar = Solar.fromYmd(deathYear, p.death_month, p.death_day);
        const lunar = solar.getLunar();
        const lMonth = Math.abs(lunar.getMonth()); // abs to handle leap month
        const lDay = lunar.getDay();

        const next = nextSolarForLunar(lMonth, lDay, today);
        if (!next) continue;

        const daysUntil = Math.round(
          (next.getTime() - today.getTime()) / (1000 * 60 * 60 * 24),
        );

        events.push({
          personId: p.id,
          personName: p.full_name,
          type: "death_anniversary",
          nextOccurrence: next,
          daysUntil,
          eventDateLabel: `${lDay.toString().padStart(2, "0")}/${lMonth.toString().padStart(2, "0")} ÂL`,
          originYear: p.death_year,
          isDeceased: p.is_deceased,
        });
      } catch {
        // Skip if lunar conversion fails
      }
    }
  }

  // ── Custom Events (solar) ───────────────────────────────────────
  for (const ce of customEvents) {
    if (!ce.event_date) continue;
    const [y, m, d] = ce.event_date.split("-").map(Number);
    if (!y || !m || !d) continue;

    const next = new Date(y, m - 1, d);
    const daysUntil = Math.round(
      (next.getTime() - today.getTime()) / (1000 * 60 * 60 * 24),
    );

    events.push({
      personId: ce.id, // using event id here
      personName: ce.name, // mapping custom event name to personName
      type: "custom_event",
      nextOccurrence: next,
      daysUntil,
      eventDateLabel: `${d.toString().padStart(2, "0")}/${m.toString().padStart(2, "0")}/${y}`,
      originYear: y,
      isDeceased: false,
      location: ce.location,
      content: ce.content,
    });
  }

  // Sort: soonest first
  events.sort((a, b) => a.daysUntil - b.daysUntil);
  return events;
}
