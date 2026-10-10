import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "./supabase";

export type Badge = { code: string; name: string; description: string; earned_at: string | null };
export type GameStats = {
  total_xp: number; level: number; level_start_xp: number; next_level_xp: number; weekly_xp: number;
  streak: number; longest_streak: number; chapters_read: number; rest_available: boolean;
  week_days: { day: string; status: "lido" | "descanso" }[]; badges: Badge[];
};

const TITLES = ["Iniciante", "Aprendiz", "Leitor", "Estudioso", "Peregrino", "Discípulo", "Servo fiel", "Vigia", "Semeador", "Pastor", "Escriba", "Sábio", "Profeta", "Mestre", "Guardião da Palavra"];
export const levelTitle = (l: number) => (l >= 16 ? "Guardião da Palavra +" : TITLES[Math.max(1, l) - 1] ?? "Iniciante");

export const GAME_KEY = ["game"];

export function useGameStats(enabled = true) {
  return useQuery({
    queryKey: GAME_KEY,
    enabled,
    queryFn: async () => {
      const { data, error } = await supabase.rpc("my_game_stats");
      if (error) throw error;
      const d = (data ?? {}) as Partial<GameStats>;
      return {
        total_xp: 0, level: 1, level_start_xp: 0, next_level_xp: 100, weekly_xp: 0, streak: 0, longest_streak: 0,
        chapters_read: 0, rest_available: false, ...d, week_days: d.week_days ?? [], badges: d.badges ?? [],
      } as GameStats;
    },
  });
}

export function xpProgress(s: GameStats) {
  const span = Math.max(1, s.next_level_xp - s.level_start_xp);
  const into = Math.max(0, s.total_xp - s.level_start_xp);
  return { pct: Math.min(100, Math.round((into / span) * 100)), left: Math.max(0, s.next_level_xp - s.total_xp) };
}

let openBadge: ((code: string) => void) | null = null;
export const setBadgeOpener = (fn: ((code: string) => void) | null) => { openBadge = fn; };

/** Calls award_badges, refreshes stats and toasts each new badge. */
export async function checkBadges(qc: ReturnType<typeof useQueryClient>) {
  const { data } = await supabase.rpc("award_badges");
  await qc.invalidateQueries({ queryKey: GAME_KEY });
  const codes = (data ?? []) as string[];
  if (!codes.length) return;
  const stats = qc.getQueryData<GameStats>(GAME_KEY);
  for (const c of codes) {
    const b = stats?.badges.find((x) => x.code === c);
    toast(`Nova conquista: ${b?.name ?? c}`, {
      description: b?.description,
      action: { label: "Ver", onClick: () => openBadge?.(c) },
      duration: 6000,
    });
  }
}

export function restErrorMsg(e: unknown) {
  const m = String((e as { message?: string })?.message ?? e);
  if (m.includes("rest_already_used")) return "Você já usou o descanso desta semana. Na segunda-feira tem outro.";
  if (m.includes("already_read_today")) return "Você já leu hoje, então não precisa descansar.";
  if (m.includes("not_authenticated")) return "Entre na sua conta para continuar.";
  return "Não deu certo agora. Tente de novo.";
}

export function useRestDay() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.rpc("take_rest_day");
      if (error) throw error;
      return data;
    },
    onSuccess: () => { toast.success("Dia de descanso registrado. Sua sequência continua."); qc.invalidateQueries({ queryKey: GAME_KEY }); },
    onError: (e) => toast.error(restErrorMsg(e)),
  });
}

export function Flame({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden fill="currentColor">
      <path d="M12 2c.5 3-1.5 4.5-3 6.5S6 12.5 6 15a6 6 0 0012 0c0-2.2-1-4-2.3-5.4.1 1.6-.6 2.9-1.7 3.4.4-3.2-.7-7.4-2-11z" />
    </svg>
  );
}
export function Moon({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden fill="currentColor">
      <path d="M20 14.5A8 8 0 019.5 4a8 8 0 1010.5 10.5z" />
    </svg>
  );
}
