import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { GameStrip, Modal, Confetti, RestButton } from "@/components/game-ui";
import { checkBadges, Flame, useGameStats } from "@/lib/game";
import { Shell, Loading, ErrorBox, RoundCheck } from "@/components/ui-fita";
import { key, longDate, spDate, TZ, planDay, streak, usePlans, usePlanItems, useReadings, useBooks, useToggleRead, useVerses, type UserPlan } from "@/lib/data";

export const Route = createFileRoute("/")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Hoje — Fita" },
      { name: "description", content: "Sua leitura bíblica de hoje, capítulo por capítulo." },
      { property: "og:title", content: "Hoje — Fita" },
      { property: "og:description", content: "Sua leitura bíblica de hoje, capítulo por capítulo." },
    ],
  }),
  component: () => <Shell>{(c) => <Today {...c} />}</Shell>,
});

function Today({ userId, up }: { userId: string; up: UserPlan }) {
  const plans = usePlans();
  const items = usePlanItems(up.plan_id);
  const readings = useReadings(userId);
  const books = useBooks();
  const toggle = useToggleRead(userId);
  const plan = plans.data?.find((p) => p.id === up.plan_id);
  const total = plan?.total_days ?? 365;
  const n = planDay(up.start_date, total);
  const todays = (items.data ?? []).filter((i) => i.day_number === n);
  const first = todays[0];
  const verses = useVerses(up.translation_id, first?.book_id ?? 0, first?.chapter ?? 0);

  const game = useGameStats();
  const qc = useQueryClient();
  const [flash, setFlash] = useState<string | null>(null);
  const [celebrate, setCelebrate] = useState(false);
  useEffect(() => { void checkBadges(qc); }, [qc]);
  const today = spDate();
  const allDone = todays.length > 0 && !!readings.data && todays.every((i) => readings.data!.some((r) => r.book_id === i.book_id && r.chapter === i.chapter));
  useEffect(() => {
    if (allDone && localStorage.getItem("fita-celebrated") !== today) { localStorage.setItem("fita-celebrated", today); setCelebrate(true); }
  }, [allDone, today]);
  useEffect(() => { if (!flash) return; const t = setTimeout(() => setFlash(null), 1100); return () => clearTimeout(t); }, [flash]);

  const q = [plans, items, readings, books];
  if (q.some((x) => x.isLoading)) return <Loading />;
  if (q.some((x) => x.isError)) return <ErrorBox onRetry={() => q.forEach((x) => x.refetch())} />;

  const read = new Set(readings.data!.map((r) => key(r.book_id, r.chapter)));
  const name = (b: number, c: number) => `${books.data!.byId.get(b)?.name_pt ?? ""} ${c}`;
  const done = todays.filter((i) => read.has(key(i.book_id, i.chapter))).length;
  const next = todays.find((i) => !read.has(key(i.book_id, i.chapter)));
  const late: typeof todays = items.data!.filter((i) => i.day_number < n && !read.has(key(i.book_id, i.chapter)));
  const s = game.data?.streak ?? streak(readings.data!);
  const xpToday = readings.data!.filter((r) => spDate(new Date(r.read_at)) === today).length * 10;
  const hour = Number(new Intl.DateTimeFormat("en-US", { timeZone: TZ, hour: "numeric", hourCycle: "h23" }).format(new Date()));
  const g = game.data;
  const touchedToday = !!g?.week_days.some((d) => d.day === today) || xpToday > 0;
  const showNudge = !!g && !touchedToday && g.streak > 2 && hour >= 18;
  const vlist = (verses.data ?? []).filter((v) => v.verse > 0);
  const vod = vlist.length ? vlist[(n - 1) % vlist.length] : null;

  return (
    <div className="space-y-5">
      <header>
        <p className="text-sm text-ink-2">{longDate()}</p>
        <h1 className="mt-1 font-serif text-3xl font-semibold">Dia {n} de {total}</h1>
      </header>

      <GameStrip />

      {showNudge && g && (
        <div role="note" className="card-fita space-y-3 p-4">
          <p className="text-sm">Sua sequência de {g.streak} dias continua se você ler hoje. Sem tempo? Use seu dia de descanso.</p>
          {g.rest_available && <RestButton s={g} className="w-full" />}
        </div>
      )}

      {late[0] && (
        <div className="card-fita flex items-center justify-between gap-3 p-4">
          <p className="text-sm">Você tem {late.length} {late.length === 1 ? "capítulo atrasado" : "capítulos atrasados"}. Retome em {name(late[0]!.book_id, late[0]!.chapter)}.</p>
          <Link to="/ler/$book/$chapter" params={{ book: String(late[0]!.book_id), chapter: String(late[0]!.chapter) }} className="btn-ghost shrink-0 px-3 py-2 text-sm">Retomar</Link>
        </div>
      )}

      <section className="card-fita relative overflow-hidden p-5 pt-6" aria-labelledby="hoje-t">
        <div className="ribbon absolute right-5 top-0 text-sm" aria-label={`${done} de ${todays.length} lidos`}>{done}/{todays.length}</div>
        <h2 id="hoje-t" className="mb-3 pr-14 text-sm font-medium text-ink-2">Leitura de hoje</h2>
        <ul className="divide-y divide-thread">
          {todays.map((i) => {
            const isRead = read.has(key(i.book_id, i.chapter));
            const label = name(i.book_id, i.chapter);
            return (
              <li key={i.position} className="relative flex items-center gap-3 py-3">
                <RoundCheck checked={isRead} label={label} onChange={() => { if (!isRead) setFlash(key(i.book_id, i.chapter)); toggle.mutate({ book: i.book_id, chapter: i.chapter, read: !isRead }); }} />
                {flash === key(i.book_id, i.chapter) && <span aria-live="polite" className="xp-float pointer-events-none absolute -top-1 left-0 text-xs font-bold text-leaf">+10 XP</span>}
                <Link to="/ler/$book/$chapter" params={{ book: String(i.book_id), chapter: String(i.chapter) }}
                  className={`font-serif text-lg ${isRead ? "text-ink-2 line-through opacity-70" : ""}`}>{label}</Link>
              </li>
            );
          })}
        </ul>
      </section>

      {vod && first && (
        <blockquote className="border-l-[3px] border-ribbon pl-4">
          <p className="font-serif text-lg leading-relaxed">{vod.text}</p>
          <footer className="mt-2 text-sm text-ink-2">{name(first.book_id, first.chapter)}:{vod.verse}</footer>
        </blockquote>
      )}

      {next ? (
        <Link to="/ler/$book/$chapter" params={{ book: String(next.book_id), chapter: String(next.chapter) }} className="btn-primary block w-full py-4 text-center text-base">
          Continuar em {name(next.book_id, next.chapter)}
        </Link>
      ) : (
        <div className="btn-primary w-full py-4 text-center text-base opacity-80">Leitura de hoje concluída</div>
      )}

      <Modal open={celebrate} onClose={() => setCelebrate(false)} labelId="cel-t">
        <Confetti />
        <h2 id="cel-t" className="font-serif text-3xl font-semibold">Leitura de hoje concluída!</h2>
        <div className="mt-4 flex justify-center gap-6">
          <div><p className="font-serif text-2xl font-semibold text-leaf">+{xpToday} XP</p><p className="text-xs text-ink-2">ganhos hoje</p></div>
          <div><p className="flex items-center justify-center gap-1 font-serif text-2xl font-semibold"><Flame className="h-5 w-5 text-ribbon" />{s}</p><p className="text-xs text-ink-2">{s === 1 ? "dia seguido" : "dias seguidos"}</p></div>
        </div>
        <button onClick={() => setCelebrate(false)} className="btn-primary mt-6 w-full py-3">Continuar</button>
      </Modal>

      <div className="flex flex-wrap gap-2">
        <span className="rounded-full border border-thread bg-card px-3 py-1.5 text-sm">{s} {s === 1 ? "dia seguido" : "dias seguidos"}</span>
        {plan && <span className="rounded-full border border-thread bg-card px-3 py-1.5 text-sm">{plan.name}</span>}
      </div>
    </div>
  );
}
