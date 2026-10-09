import { createFileRoute, Link } from "@tanstack/react-router";
import { Shell, Loading, ErrorBox, RoundCheck } from "@/components/ui-fita";
import { key, longDate, planDay, streak, usePlans, usePlanItems, useReadings, useBooks, useToggleRead, useVerses, type UserPlan } from "@/lib/data";

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

  const q = [plans, items, readings, books];
  if (q.some((x) => x.isLoading)) return <Loading />;
  if (q.some((x) => x.isError)) return <ErrorBox onRetry={() => q.forEach((x) => x.refetch())} />;

  const read = new Set(readings.data!.map((r) => key(r.book_id, r.chapter)));
  const name = (b: number, c: number) => `${books.data!.byId.get(b)?.name_pt ?? ""} ${c}`;
  const done = todays.filter((i) => read.has(key(i.book_id, i.chapter))).length;
  const next = todays.find((i) => !read.has(key(i.book_id, i.chapter)));
  const late: typeof todays = items.data!.filter((i) => i.day_number < n && !read.has(key(i.book_id, i.chapter)));
  const s = streak(readings.data!);
  const vlist = (verses.data ?? []).filter((v) => v.verse > 0);
  const vod = vlist.length ? vlist[(n - 1) % vlist.length] : null;

  return (
    <div className="space-y-5">
      <header>
        <p className="text-sm text-ink-2">{longDate()}</p>
        <h1 className="mt-1 font-serif text-3xl font-semibold">Dia {n} de {total}</h1>
      </header>

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
              <li key={i.position} className="flex items-center gap-3 py-3">
                <RoundCheck checked={isRead} label={label} onChange={() => toggle.mutate({ book: i.book_id, chapter: i.chapter, read: !isRead })} />
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

      <div className="flex flex-wrap gap-2">
        <span className="rounded-full border border-thread bg-card px-3 py-1.5 text-sm">{s} {s === 1 ? "dia seguido" : "dias seguidos"}</span>
        {plan && <span className="rounded-full border border-thread bg-card px-3 py-1.5 text-sm">{plan.name}</span>}
      </div>
    </div>
  );
}
