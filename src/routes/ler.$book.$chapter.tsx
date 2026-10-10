import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Shell, Loading, ErrorBox } from "@/components/ui-fita";
import { key, useBooks, useReadings, useToggleRead, useTranslation, useVerses, type UserPlan } from "@/lib/data";

export const Route = createFileRoute("/ler/$book/$chapter")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Leitor — Fita" },
      { name: "description", content: "Leia o capítulo com calma e marque como lido." },
      { property: "og:title", content: "Leitor — Fita" },
      { property: "og:description", content: "Leia o capítulo com calma e marque como lido." },
    ],
  }),
  component: () => <Shell nav={false}>{(c) => <Reader {...c} />}</Shell>,
});

type Ref = { book: number; chapter: number } | null;

function Arrow({ to, dir }: { to: Ref; dir: "prev" | "next" }) {
  if (!to) return <span className="h-12 w-12" />;
  return (
    <Link to="/ler/$book/$chapter" params={{ book: String(to.book), chapter: String(to.chapter) }}
      aria-label={dir === "prev" ? "Capítulo anterior" : "Próximo capítulo"}
      className="btn-ghost grid h-12 w-12 place-items-center text-xl">{dir === "prev" ? "‹" : "›"}</Link>
  );
}

function BackHome() {
  return (
    <div className="space-y-4">
      <ErrorBox />
      <Link to="/" className="btn-ghost block px-4 py-3 text-center text-sm font-medium">Voltar para Hoje</Link>
    </div>
  );
}

function Reader({ userId, up }: { userId: string; up: UserPlan }) {
  const p = Route.useParams();
  const book = Number(p.book), chapter = Number(p.chapter);
  const validIds = Number.isInteger(book) && Number.isInteger(chapter) && book >= 1 && book <= 66 && chapter >= 1;
  const books = useBooks();
  const verses = useVerses(up.translation_id, validIds ? book : 0, validIds ? chapter : 0);
  const readings = useReadings(userId);
  const tr = useTranslation(up.translation_id);
  const toggle = useToggleRead(userId);
  const [size, setSize] = useState(19);
  useEffect(() => { const s = Number(localStorage.getItem("fita-font")); if (s) setSize(s); }, []);
  const change = (d: number) => setSize((s) => { const n = Math.min(30, Math.max(14, s + d)); localStorage.setItem("fita-font", String(n)); return n; });
  useEffect(() => { window.scrollTo(0, 0); }, [book, chapter]);

  if (!validIds) return <BackHome />;
  if (books.isLoading) return <Loading />;
  if (books.isError || !books.data) return <ErrorBox onRetry={() => books.refetch()} />;
  const byId = books.data.byId;
  const b = byId.get(book);
  if (!b || chapter > b.chapters) return <BackHome />;
  const prevBook = byId.get(book - 1);
  const prev: Ref = chapter > 1 ? { book, chapter: chapter - 1 } : prevBook ? { book: book - 1, chapter: prevBook.chapters } : null;
  const next: Ref = chapter < b.chapters ? { book, chapter: chapter + 1 } : byId.has(book + 1) ? { book: book + 1, chapter: 1 } : null;
  const isRead = !!readings.data?.some((r) => key(r.book_id, r.chapter) === key(book, chapter));
  const rows = verses.data ?? [];
  const title = rows.find((v) => v.verse === 0);

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div className="flex gap-4 text-sm text-ink-2"><Link to="/">‹ Hoje</Link><Link to="/biblia">Livros</Link></div>
        <div className="flex gap-2">
          <button onClick={() => change(-2)} aria-label="Diminuir fonte" className="btn-ghost px-3 py-1.5 text-sm">A−</button>
          <button onClick={() => change(2)} aria-label="Aumentar fonte" className="btn-ghost px-3 py-1.5 text-base">A+</button>
        </div>
      </div>
      <h1 className="font-serif text-3xl font-semibold">{b.name_pt} {chapter}</h1>
      {title && <p className="mt-2 font-serif italic text-ink-2">{title.text}</p>}

      <div key={`${book}-${chapter}`} className="mt-6 pb-32 font-serif leading-relaxed" style={{ fontSize: size }}>
        {verses.isLoading || verses.isFetching && !verses.data ? <Loading /> : verses.isError ? <ErrorBox onRetry={() => verses.refetch()} /> :
          rows.filter((v) => v.verse > 0).map((v) => (
            <p key={v.verse} className="mb-2"><sup className="mr-1 font-sans text-[0.6em] font-semibold text-ink-2">{v.verse}</sup>{v.text}</p>
          ))}
        <p className="mt-8 text-center font-sans text-xs tracking-widest text-ink-2">{tr.data?.code ?? "BLIVRE"}</p>
      </div>

      <div className="fixed inset-x-0 bottom-0 z-20 border-t border-thread bg-paper">
        <div className="mx-auto flex max-w-[430px] items-center gap-3 px-5 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
          <Arrow to={prev} dir="prev" />
          <button onClick={() => toggle.mutate({ book, chapter, read: !isRead })} aria-pressed={isRead}
            className={`h-12 flex-1 rounded-[14px] font-semibold ${isRead ? "border-2 border-leaf bg-card text-leaf" : "btn-primary"}`}>
            {isRead ? "Lido ✓" : "Marcar como lido"}
          </button>
          <Arrow to={next} dir="next" />
        </div>
      </div>
    </div>
  );
}
