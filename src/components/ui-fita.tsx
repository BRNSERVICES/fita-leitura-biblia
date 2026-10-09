import { Link, Navigate, useLocation } from "@tanstack/react-router";
import type { ReactNode } from "react";
import { useAuth } from "@/lib/auth";
import { useUserPlan, type UserPlan } from "@/lib/data";
import { Onboarding } from "./Onboarding";

export function Loading({ label = "Carregando…" }: { label?: string }) {
  return (
    <div role="status" className="flex flex-col items-center gap-3 py-16 text-ink-2">
      <span className="h-6 w-6 animate-spin rounded-full border-2 border-thread border-t-ink" />
      <span className="text-sm">{label}</span>
    </div>
  );
}

export function ErrorBox({ onRetry }: { onRetry?: () => void }) {
  return (
    <div role="alert" className="card-fita p-5 text-center">
      <p className="font-serif text-lg">Não conseguimos carregar agora.</p>
      <p className="mt-1 text-sm text-ink-2">Verifique sua conexão e tente de novo.</p>
      {onRetry && <button onClick={onRetry} className="btn-ghost mt-4 px-4 py-2 text-sm">Tentar de novo</button>}
    </div>
  );
}

export function RoundCheck({ checked, onChange, label }: { checked: boolean; onChange: () => void; label: string }) {
  return (
    <button
      role="checkbox"
      aria-checked={checked}
      aria-label={label}
      onClick={onChange}
      className={`grid h-7 w-7 shrink-0 place-items-center rounded-full border-2 transition-colors ${checked ? "border-leaf bg-leaf" : "border-thread bg-card"}`}
    >
      {checked && (
        <svg viewBox="0 0 16 16" className="h-4 w-4 text-paper" aria-hidden>
          <path d="M3.5 8.5l3 3 6-7" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      )}
    </button>
  );
}

const tabs = [
  { to: "/", label: "Hoje" },
  { to: "/plano", label: "Plano" },
  { to: "/juntos", label: "Juntos" },
  { to: "/ajustes", label: "Ajustes" },
] as const;

function BottomNav() {
  const { pathname } = useLocation();
  return (
    <nav aria-label="Navegação principal" className="fixed inset-x-0 bottom-0 z-20 border-t border-thread bg-paper">
      <div role="tablist" className="mx-auto flex max-w-[430px]">
        {tabs.map((t) => {
          const active = pathname === t.to;
          return (
            <Link key={t.to} to={t.to} role="tab" aria-selected={active}
              className={`flex-1 border-t-[3px] py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] text-center text-sm font-medium ${active ? "border-ribbon text-ink" : "border-transparent text-ink-2"}`}>
              {t.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}

export function Shell({ children, nav = true }: { children: (ctx: { userId: string; up: UserPlan }) => ReactNode; nav?: boolean }) {
  const { session, loading } = useAuth();
  const userId = session?.user.id ?? "";
  const up = useUserPlan(userId);
  if (loading) return <Frame><Loading /></Frame>;
  if (!session) return <Navigate to="/auth" />;
  if (typeof window !== "undefined" && sessionStorage.getItem("fita-codigo")) return <Navigate to="/entrar" search={{ codigo: undefined }} />;
  return (
    <Frame nav={nav && !!up.data}>
      {up.isLoading ? <Loading /> : up.isError ? <ErrorBox onRetry={() => up.refetch()} /> :
        !up.data ? <Onboarding userId={userId} /> : children({ userId, up: up.data })}
    </Frame>
  );
}

export function Frame({ children, nav }: { children: ReactNode; nav?: boolean }) {
  return (
    <div className="min-h-screen bg-page">
      <main className={`mx-auto min-h-screen max-w-[430px] bg-paper px-5 pt-8 ${nav ? "pb-28" : "pb-10"}`}>{children}</main>
      {nav && <BottomNav />}
    </div>
  );
}
