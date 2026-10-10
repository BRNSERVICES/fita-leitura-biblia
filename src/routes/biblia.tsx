import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Shell, Loading, ErrorBox } from "@/components/ui-fita";
import { key, useBooks, useReadings } from "@/lib/data";

export const Route = createFileRoute("/biblia")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Bíblia — Fita" },
      { name: "description", content: "Escolha qualquer livro e capítulo da Bíblia para ler." },
      { property: "og:title", content: "Bíblia — Fita" },
      { property: "og:description", content: "Escolha qualquer livro e capítulo da Bíblia para ler." },
    ],
  }),
  component: () => <Shell>{(c) => <BiblePage userId={c.userId} />}</Shell>,
});

const norm = (s: string) => s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();

function BiblePage({ userId }: { userId: string }) {
  const books = useBooks();
  const readings = useReadings(userId);
  const [open, setOpen] = useState<number | null>(null);
  const [q, setQ] = useState("");
  const read = useMemo(() => new Set((readings.data ?? []).map((r) => key(r.book_id, r.chapter))), [readings.data]);
  const perBook = useMemo(() => {
    const m = new Map<number, number>();
    (readings.data ?? []).forEach((r) => m.set(r.book_id, (m.get(r.book_id) ?? 0) + 1));
    return m;
  }, [readings.data]);

  if (books.isLoading) return <Loading />;
  if (books.isError || !books.data) return <ErrorBox onRetry={() => books.refetch()} />;

  const term = norm(q);
  const list = books.data.list.filter((b) => !term || norm(b.name_pt).includes(term) || norm(b.abbrev).includes(term));
  const groups = [
    { label: "Antigo Testamento", items: list.filter((b) => b.testament === "AT") },
    { label: "Novo Testamento", items: list.filter((b) => b.testament === "NT") },
  ].filter((g) => g.items.length > 0);

  return (
    <div className="space-y-5">
      <h1 className="font-serif text-3xl font-semibold">Bíblia</h1>
      <p className="-mt-3 text-sm text-ink-2">Escolha qualquer livro e capítulo. Tudo o que você ler conta pontos.</p>
      <label className="block">
        <span className="sr-only">Buscar livro</span>
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar livro (ex.: Salmos, João)"
          className="w-full rounded-[14px] border border-thread bg-card px-4 py-3 text-base outline-none focus-visible:ring-2 focus-visible:ring-ribbon" />
      </label>

      {groups.length === 0 && <p className="text-sm text-ink-2">Nenhum livro encontrado.</p>}

      {groups.map((g) => (
        <section key={g.label}>
          <h2 className="mb-2 px-1 text-sm font-medium text-ink-2">{g.label}</h2>
          <ul className="card-fita divide-y divide-thread overflow-hidden">
            {g.items.map((b) => {
              const isOpen = open === b.id || (!!term && g.items.length === 1);
              const done = perBook.get(b.id) ?? 0;
              return (
                <li key={b.id}>
                  <button onClick={() => setOpen(isOpen ? null : b.id)} aria-expanded={isOpen}
                    className="flex min-h-[52px] w-full items-center justify-between gap-3 px-4 py-3 text-left">
                    <span className="font-serif text-lg">{b.name_pt}</span>
                    <span className="flex items-center gap-2 text-xs text-ink-2">
                      {done > 0 && <span className={done >= b.chapters ? "font-semibold text-leaf" : ""}>{done}/{b.chapters}</span>}
                      <span aria-hidden>{isOpen ? "▴" : "▾"}</span>
                    </span>
                  </button>
                  {isOpen && (
                    <div className="grid grid-cols-6 gap-2 bg-page px-4 py-3">
                      {Array.from({ length: b.chapters }, (_, i) => i + 1).map((c) => {
                        const isRead = read.has(key(b.id, c));
                        return (
                          <Link key={c} to="/ler/$book/$chapter" params={{ book: String(b.id), chapter: String(c) }}
                            aria-label={`${b.name_pt} ${c}${isRead ? ", lido" : ""}`}
                            className={`grid h-11 place-items-center rounded-[12px] border text-sm font-medium ${isRead ? "border-leaf bg-leaf text-paper" : "border-thread bg-card"}`}>
                            {c}
                          </Link>
                        );
                      })}
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        </section>
      ))}
    </div>
  );
}
