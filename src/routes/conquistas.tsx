import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Shell, Loading, ErrorBox } from "@/components/ui-fita";
import { BadgeIcon, BadgeModal, fmtDate, LevelSeal, RestButton, XpBar } from "@/components/game-ui";
import { dayNum, spDate } from "@/lib/data";
import { Flame, levelTitle, Moon, useGameStats, xpProgress, type Badge } from "@/lib/game";

export const Route = createFileRoute("/conquistas")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Conquistas — Fita" },
      { name: "description", content: "Seu nível, sequência e conquistas de leitura." },
      { property: "og:title", content: "Conquistas — Fita" },
      { property: "og:description", content: "Seu nível, sequência e conquistas de leitura." },
    ],
  }),
  component: () => <Shell>{() => <Achievements />}</Shell>,
});

function Achievements() {
  const g = useGameStats();
  const [open, setOpen] = useState<Badge | null>(null);
  if (g.isLoading) return <Loading />;
  if (g.isError || !g.data) return <ErrorBox onRetry={() => g.refetch()} />;
  const s = g.data;
  const { left } = xpProgress(s);
  const today = dayNum(spDate());
  const monday = today - ((new Date(today * 86400000).getUTCDay() + 6) % 7);
  const status = new Map(s.week_days.map((d) => [dayNum(d.day), d.status]));
  const labels = ["S", "T", "Q", "Q", "S", "S", "D"];
  const full = ["Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado", "Domingo"];
  const earned = s.badges.filter((b) => b.earned_at).length;

  return (
    <div className="space-y-5">
      <h1 className="font-serif text-3xl font-semibold">Conquistas</h1>

      <section className="card-fita space-y-3 p-5">
        <div className="flex items-center justify-between"><h2 className="font-serif text-2xl font-semibold">{levelTitle(s.level)}</h2><LevelSeal level={s.level} small /></div>
        <XpBar s={s} />
        <p className="text-sm text-ink-2">{s.total_xp} XP · faltam {left} XP para o próximo nível</p>
      </section>

      <section className="grid grid-cols-2 gap-3" aria-label="Seus números">
        {[[<><Flame className="h-5 w-5 text-ribbon" />{s.streak}</>, "sequência atual"], [s.longest_streak, "melhor sequência"], [s.chapters_read, "capítulos lidos"], [s.weekly_xp, "XP da semana"]].map(([v, l], i) => (
          <div key={i} className="card-fita p-4"><p className="flex items-center gap-1 font-serif text-2xl font-semibold">{v}</p><p className="text-xs text-ink-2">{l as string}</p></div>
        ))}
      </section>

      <section className="card-fita p-5">
        <h2 className="mb-4 text-sm font-medium text-ink-2">Esta semana</h2>
        <ul className="flex justify-between">
          {labels.map((l, i) => {
            const d = monday + i; const st = status.get(d); const isToday = d === today;
            return (
              <li key={i} className="flex flex-col items-center gap-2" aria-label={`${full[i]}: ${st === "lido" ? "leu" : st === "descanso" ? "descanso" : "sem registro"}${isToday ? ", hoje" : ""}`}>
                <span className={`text-xs ${isToday ? "font-bold" : "text-ink-2"}`}>{l}</span>
                <span className={`grid h-8 w-8 place-items-center rounded-full border-2 ${st === "lido" ? "border-leaf bg-leaf" : st === "descanso" ? "border-rest bg-rest/20" : "border-thread"} ${isToday ? "ring-2 ring-ink ring-offset-2 ring-offset-card" : ""}`}>
                  {st === "descanso" && <Moon className="h-4 w-4 text-rest" />}
                </span>
              </li>
            );
          })}
        </ul>
      </section>

      <section className="card-fita space-y-3 p-5">
        <p className="text-sm">Hoje está corrido? Use seu dia de descanso da semana: sua sequência continua.</p>
        <RestButton s={s} className="w-full" />
        {!s.rest_available && <p className="text-xs text-ink-2">O descanso desta semana já foi usado ou não é necessário hoje.</p>}
      </section>

      <section>
        <h2 className="mb-2 px-1 text-sm font-medium text-ink-2">{earned} de {s.badges.length || 17}</h2>
        <ul className="grid grid-cols-3 gap-3">
          {s.badges.map((b) => (
            <li key={b.code}>
              <button onClick={() => setOpen(b)} className={`card-fita flex h-full w-full flex-col items-center gap-1 p-3 text-center ${b.earned_at ? "" : "opacity-80"}`}>
                <BadgeIcon earned={!!b.earned_at} />
                <span className={`text-xs font-medium ${b.earned_at ? "" : "text-ink-2"}`}>{b.name}</span>
                <span className="text-[11px] text-ink-2">{b.earned_at ? fmtDate(b.earned_at) : b.description}</span>
              </button>
            </li>
          ))}
        </ul>
      </section>
      <BadgeModal badge={open} onClose={() => setOpen(null)} />
    </div>
  );
}
