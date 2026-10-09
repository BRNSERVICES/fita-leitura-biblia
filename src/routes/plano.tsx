import { createFileRoute } from "@tanstack/react-router";
import { Shell, Loading, ErrorBox } from "@/components/ui-fita";
import { dayNum, key, planChapterSet, readingDays, spDate, usePlanItems, usePlans, useReadings, type UserPlan } from "@/lib/data";

export const Route = createFileRoute("/plano")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Plano — Fita" },
      { name: "description", content: "Seu progresso no plano de leitura da Bíblia." },
      { property: "og:title", content: "Plano — Fita" },
      { property: "og:description", content: "Seu progresso no plano de leitura da Bíblia." },
    ],
  }),
  component: () => <Shell>{(c) => <PlanPage {...c} />}</Shell>,
});

const pct = (a: number, b: number) => Math.min(100, Math.round((a / b) * 100));

function PlanPage({ userId, up }: { userId: string; up: UserPlan }) {
  const plans = usePlans();
  const readings = useReadings(userId);
  const items = usePlanItems(up.plan_id);
  if (plans.isLoading || readings.isLoading || items.isLoading) return <Loading />;
  if (plans.isError || readings.isError || items.isError) return <ErrorBox onRetry={() => { plans.refetch(); readings.refetch(); items.refetch(); }} />;
  const plan = plans.data!.find((p) => p.id === up.plan_id);
  const r = readings.data!;
  const inPlan = planChapterSet(items.data!);
  const TOTAL = inPlan.size || 1189;
  const readInPlan = r.filter((x) => inPlan.has(key(x.book_id, x.chapter))).length;
  const overall = pct(readInPlan, TOTAL);
  const at = r.filter((x) => x.book_id <= 39).length;
  const nt = r.length - at;
  const days = readingDays(r);
  const today = dayNum(spDate());
  const dow = (new Date(today * 86400000).getUTCDay() + 6) % 7; // 0 = segunda
  const monday = today - dow;
  const labels = ["S", "T", "Q", "Q", "S", "S", "D"];
  const full = ["Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado", "Domingo"];

  return (
    <div className="space-y-5">
      <h1 className="font-serif text-3xl font-semibold">{plan?.name ?? "Plano"}</h1>

      <section className="card-fita p-5">
        <h2 className="text-sm font-medium text-ink-2">Progresso geral</h2>
        <p className="mt-1 font-serif text-4xl font-semibold">{overall}%</p>
        <p className="text-sm text-ink-2">{readInPlan} de {TOTAL} capítulos</p>
        <div className="relative mt-4 h-3 rounded-full bg-page" role="progressbar" aria-valuenow={overall} aria-valuemin={0} aria-valuemax={100} aria-label="Progresso geral">
          <div className="h-full rounded-full bg-leaf" style={{ width: `${overall}%` }} />
          <div className="absolute -top-1.5 h-6 w-[3px] rounded-sm bg-ribbon" style={{ left: `calc(${overall}% - 1.5px)` }} aria-hidden />
        </div>
      </section>

      <section className="card-fita p-5">
        <h2 className="mb-4 text-sm font-medium text-ink-2">Esta semana</h2>
        <ul className="flex justify-between">
          {labels.map((l, i) => {
            const d = monday + i;
            const on = days.has(d);
            const isToday = d === today;
            return (
              <li key={i} className="flex flex-col items-center gap-2" aria-label={`${full[i]}: ${on ? "com leitura" : "sem leitura"}${isToday ? ", hoje" : ""}`}>
                <span className={`text-xs ${isToday ? "font-bold text-ink" : "text-ink-2"}`}>{l}</span>
                <span className={`h-8 w-8 rounded-full border-2 ${on ? "border-leaf bg-leaf" : "border-thread"} ${isToday ? "ring-2 ring-ink ring-offset-2 ring-offset-card" : ""}`} />
              </li>
            );
          })}
        </ul>
      </section>

      <section className="card-fita grid grid-cols-2 gap-4 p-5">
        {[["Antigo Testamento", at, 929], ["Novo Testamento", nt, 260]].map(([t, a, b]) => (
          <div key={t as string}>
            <h2 className="text-sm text-ink-2">{t}</h2>
            <p className="mt-1 font-serif text-2xl font-semibold">{pct(a as number, b as number)}%</p>
            <div className="mt-2 h-2 rounded-full bg-page"><div className="h-full rounded-full bg-leaf" style={{ width: `${pct(a as number, b as number)}%` }} /></div>
            <p className="mt-1 text-xs text-ink-2">{a} de {b}</p>
          </div>
        ))}
      </section>
    </div>
  );
}
