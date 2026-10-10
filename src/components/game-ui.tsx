import { useEffect, useRef, useState, type ReactNode } from "react";
import { Flame, levelTitle, Moon, setBadgeOpener, useGameStats, useRestDay, xpProgress, type Badge, type GameStats } from "@/lib/game";

export function Modal({ open, onClose, labelId, children }: { open: boolean; onClose: () => void; labelId: string; children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const prev = document.activeElement as HTMLElement | null;
    ref.current?.querySelector<HTMLElement>("button")?.focus();
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => { window.removeEventListener("keydown", onKey); prev?.focus?.(); };
  }, [open, onClose]);
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-ink/40 p-5" onClick={onClose}>
      <div ref={ref} role="dialog" aria-modal="true" aria-labelledby={labelId} onClick={(e) => e.stopPropagation()}
        className="card-fita pop-in relative w-full max-w-[380px] overflow-hidden p-6 text-center">
        {children}
      </div>
    </div>
  );
}

const CONFETTI = ["var(--ribbon)", "var(--leaf)", "var(--rest)", "var(--ink)"];
export function Confetti() {
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
      {Array.from({ length: 22 }, (_, i) => (
        <span key={i} className="confetti-piece" style={{ left: `${(i * 37) % 100}%`, background: CONFETTI[i % 4], animationDelay: `${(i % 7) * 0.12}s` }} />
      ))}
    </div>
  );
}

export function LevelSeal({ level, small }: { level: number; small?: boolean }) {
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full border border-thread bg-card font-medium ${small ? "px-2 py-0.5 text-xs" : "px-3 py-1 text-sm"}`}>
      <span className="grid h-5 w-5 place-items-center rounded-full bg-ink text-[10px] font-bold text-paper" aria-hidden>{level}</span>
      <span>{levelTitle(level)}</span>
      <span className="sr-only">, nível {level}</span>
    </span>
  );
}

export function XpBar({ s }: { s: GameStats }) {
  const { pct } = xpProgress(s);
  return (
    <div className="h-2.5 rounded-full bg-page" role="progressbar" aria-label="XP até o próximo nível" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100}>
      <div className="h-full rounded-full bg-leaf transition-[width] duration-500" style={{ width: `${pct}%` }} />
    </div>
  );
}

export function GameStrip() {
  const g = useGameStats();
  if (g.isLoading) return <div className="card-fita h-[92px] animate-pulse" aria-label="Carregando progresso" />;
  if (g.isError || !g.data) return null;
  const s = g.data;
  return (
    <section aria-label="Seu progresso" className="card-fita space-y-3 p-4">
      <div className="flex items-center justify-between gap-2">
        <span className="flex items-center gap-1.5 font-semibold">
          <Flame className="h-5 w-5 text-ribbon" />{s.streak} {s.streak === 1 ? "dia seguido" : "dias seguidos"}
        </span>
        <LevelSeal level={s.level} small />
      </div>
      <div>
        <div className="mb-1 flex justify-between text-xs text-ink-2"><span>{s.total_xp} XP</span><span>{s.next_level_xp} XP</span></div>
        <XpBar s={s} />
      </div>
      {s.streak === 0 && s.longest_streak > 0 && (
        <p className="text-sm text-ink-2">Recomece hoje. Sua melhor sequência foi de {s.longest_streak} dias.</p>
      )}
    </section>
  );
}

export function RestButton({ s, className = "" }: { s: GameStats; className?: string }) {
  const rest = useRestDay();
  return (
    <button onClick={() => rest.mutate()} disabled={!s.rest_available || rest.isPending}
      className={`btn-ghost inline-flex items-center justify-center gap-2 px-4 py-3 text-sm font-medium disabled:opacity-50 ${className}`}>
      <Moon className="h-4 w-4 text-rest" />{rest.isPending ? "Registrando…" : "Usar dia de descanso"}
    </button>
  );
}

export function BadgeIcon({ earned, className = "h-7 w-7" }: { earned: boolean; className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={`${className} ${earned ? "text-ribbon" : "text-thread"}`} aria-hidden fill="currentColor">
      <path d="M7 2h10v9l-5 3-5-3z" opacity=".55" />
      <circle cx="12" cy="15" r="6" />
      <path d="M12 12l.9 1.9 2 .3-1.5 1.4.4 2-1.8-1-1.8 1 .4-2-1.5-1.4 2-.3z" fill="var(--card)" />
    </svg>
  );
}

export function fmtDate(iso: string) {
  return new Intl.DateTimeFormat("pt-BR", { day: "numeric", month: "short", year: "numeric", timeZone: "America/Sao_Paulo" }).format(new Date(iso));
}

export function BadgeModal({ badge, onClose }: { badge: Badge | null; onClose: () => void }) {
  return (
    <Modal open={!!badge} onClose={onClose} labelId="badge-t">
      {badge && (<>
        <div className="mx-auto mb-3 grid h-16 w-16 place-items-center rounded-full bg-page"><BadgeIcon earned={!!badge.earned_at} className="h-10 w-10" /></div>
        <h2 id="badge-t" className="font-serif text-2xl font-semibold">{badge.name}</h2>
        <p className="mt-2 text-sm text-ink-2">{badge.description}</p>
        <p className="mt-2 text-xs text-ink-2">{badge.earned_at ? `Conquistada em ${fmtDate(badge.earned_at)}` : "Ainda por vir"}</p>
        <button onClick={onClose} className="btn-primary mt-5 w-full py-3">Fechar</button>
      </>)}
    </Modal>
  );
}

/** Global: level-up celebration and badge card opened from toasts. */
export function GameLayer() {
  const g = useGameStats();
  const [levelUp, setLevelUp] = useState<number | null>(null);
  const [badgeCode, setBadgeCode] = useState<string | null>(null);
  useEffect(() => { setBadgeOpener(setBadgeCode); return () => setBadgeOpener(null); }, []);
  useEffect(() => {
    const lvl = g.data?.level;
    if (!lvl) return;
    const seen = Number(localStorage.getItem("fita-level") || 0);
    if (seen && lvl > seen) setLevelUp(lvl);
    if (lvl !== seen) localStorage.setItem("fita-level", String(lvl));
  }, [g.data?.level]);
  const badge = g.data?.badges.find((b) => b.code === badgeCode) ?? null;
  return (
    <>
      <Modal open={levelUp !== null} onClose={() => setLevelUp(null)} labelId="lvl-t">
        <Confetti />
        <p className="text-sm text-ink-2">Você subiu de nível</p>
        <h2 id="lvl-t" className="mt-1 font-serif text-3xl font-semibold">{levelUp ? levelTitle(levelUp) : ""}</h2>
        <p className="mt-2 text-sm text-ink-2">Nível {levelUp}. Cada capítulo conta.</p>
        <button onClick={() => setLevelUp(null)} className="btn-primary mt-5 w-full py-3">Continuar</button>
      </Modal>
      <BadgeModal badge={badge} onClose={() => setBadgeCode(null)} />
    </>
  );
}
