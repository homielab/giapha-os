import Footer from "@/components/Footer";
import LandingHero from "@/components/LandingHero";
import PublicDashboard from "@/components/PublicDashboard";
import PublicHeader from "@/components/PublicHeader";
import { createPublicClient } from "@/utils/supabase/public";
import { computeEvents } from "@/utils/eventHelpers";
import config from "./config";
import { headers } from "next/headers";

async function getPublicDashboardData() {
  const supabase = createPublicClient();

  const { data: setting } = await supabase
    .from("family_settings")
    .select("setting_value")
    .eq("setting_key", "public_dashboard_enabled")
    .maybeSingle();

  if (setting?.setting_value !== "true") return null;

  const [membersRes, announcementsRes] = await Promise.all([
    supabase
      .from("persons")
      .select(
        "id, full_name, is_deceased, gender, birth_year, birth_month, birth_day, death_year, death_month, death_day, generation, created_at",
      )
      .order("created_at", { ascending: false }),
    supabase
      .from("announcements")
      .select("*")
      .or("expires_at.is.null,expires_at.gt." + new Date().toISOString())
      .order("is_pinned", { ascending: false })
      .order("created_at", { ascending: false })
      .limit(10),
  ]);

  const persons = membersRes.data ?? [];
  const announcements = announcementsRes.data ?? [];

  const generations = new Set(persons.map((p) => p.generation).filter(Boolean));
  const stats = {
    totalMembers: persons.length,
    totalGenerations: generations.size,
    totalBranches: 0,
    totalLiving: persons.filter((p) => !p.is_deceased).length,
    totalDeceased: persons.filter((p) => p.is_deceased).length,
  };

  const { count: branchCount } = await supabase
    .from("branches")
    .select("id", { count: "exact", head: true });
  stats.totalBranches = branchCount ?? 0;

  const allEvents = computeEvents(persons);
  const upcomingEvents = allEvents
    .filter((e) => e.daysUntil >= 0 && e.daysUntil <= 30 && e.type !== "custom_event")
    .slice(0, 8)
    .map((e) => ({
      personName: e.personName,
      type: e.type as "birthday" | "death_anniversary",
      daysUntil: e.daysUntil,
      dateLabel: e.eventDateLabel,
      isDeceased: e.isDeceased,
    }));

  const recentMembers = persons.slice(0, 5).map((p) => ({
    id: p.id as string,
    full_name: p.full_name as string,
    is_deceased: p.is_deceased as boolean,
    gender: p.gender as "male" | "female" | "other",
    birth_year: (p.birth_year ?? null) as number | null,
  }));

  return { stats, announcements, upcomingEvents, recentMembers };
}

export default async function HomePage() {
  const dashboardData = await getPublicDashboardData();

  // Detect if running on demo domain to show/hide demo button on landing page
  const headersList = await headers();
  const host = headersList.get("host") ?? "";
  const isDemo = host === config.demoDomain || host.replace(/^www\./, "") === config.demoDomain;
  const demoUrl = `https://${config.demoDomain}`;

  if (dashboardData) {
    return (
      <div className="min-h-screen bg-[#fafaf9] flex flex-col">
        <PublicHeader siteName={config.siteName} />
        <main className="flex-1">
          <PublicDashboard
            siteName={config.siteName}
            stats={dashboardData.stats}
            announcements={dashboardData.announcements}
            upcomingEvents={dashboardData.upcomingEvents}
            recentMembers={dashboardData.recentMembers}
          />
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#fafaf9] flex flex-col selection:bg-amber-200 selection:text-amber-900 relative overflow-hidden">
      {/* Decorative background */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808008_1px,transparent_1px),linear-gradient(to_bottom,#80808008_1px,transparent_1px)] bg-size-[24px_24px] pointer-events-none" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_800px_at_50%_-30%,#fef3c7,transparent)] pointer-events-none" />
      <div className="absolute top-[-10%] right-[-5%] w-[50vw] h-[50vw] max-w-[600px] max-h-[600px] bg-amber-300/20 rounded-full blur-[100px] mix-blend-multiply pointer-events-none" />
      <div className="absolute top-[20%] left-[-10%] w-[60vw] h-[60vw] max-w-[800px] max-h-[800px] bg-rose-200/20 rounded-full blur-[120px] mix-blend-multiply pointer-events-none" />

      <PublicHeader siteName={config.siteName} />

      <main className="flex-1 relative z-10 w-full px-4 py-12 sm:py-16">
        <LandingHero
          siteName={config.siteName}
          demoUrl={demoUrl}
          showDemo={!isDemo}
        />
      </main>

      <Footer className="bg-transparent relative z-10 border-none" />
    </div>
  );
}
