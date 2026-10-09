import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { supabase } from "./supabase";

export const TZ = "America/Sao_Paulo";
export const TOTAL_CHAPTERS = 1189;

export type Book = { id: number; name_pt: string; abbrev: string; testament: "AT" | "NT"; chapters: number };
export type Plan = { id: number; slug: string; name: string; total_days: number };
export type PlanItem = { day_number: number; position: number; book_id: number; chapter: number };
export type UserPlan = { id: number; user_id: string; plan_id: number; translation_id: number; start_date: string; reminder_time: string | null };
export type Reading = { book_id: number; chapter: number; read_at: string };
export type Verse = { verse: number; text: string };

// ---------- dates ----------
export function spDate(d: Date = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: TZ, year: "numeric", month: "2-digit", day: "2-digit" }).format(d);
}
export function dayNum(s: string) {
  const [y, m, d] = s.slice(0, 10).split("-").map(Number);
  return Math.round(Date.UTC(y, m - 1, d) / 86400000);
}
export function fromDayNum(n: number) {
  return new Date(n * 86400000).toISOString().slice(0, 10);
}
export function longDate(d = new Date()) {
  const s = new Intl.DateTimeFormat("pt-BR", { timeZone: TZ, weekday: "long", day: "numeric", month: "long" }).format(d);
  return s.charAt(0).toUpperCase() + s.slice(1);
}
export function planDay(start: string, total: number) {
  const n = dayNum(spDate()) - dayNum(start) + 1;
  return Math.min(Math.max(n, 1), total);
}
export function readingDays(readings: Reading[]) {
  return new Set(readings.map((r) => dayNum(spDate(new Date(r.read_at)))));
}
export function streak(readings: Reading[]) {
  const days = readingDays(readings);
  let d = dayNum(spDate());
  if (!days.has(d)) d -= 1;
  let n = 0;
  while (days.has(d)) { n++; d--; }
  return n;
}
export const key = (b: number, c: number) => `${b}:${c}`;

// ---------- pagination ----------
async function fetchAll<T>(build: (from: number, to: number) => PromiseLike<{ data: T[] | null; error: unknown }>) {
  const out: T[] = [];
  for (let from = 0; ; from += 1000) {
    const { data, error } = await build(from, from + 999);
    if (error) throw error;
    out.push(...(data ?? []));
    if (!data || data.length < 1000) break;
  }
  return out;
}

// ---------- queries ----------
export function useBooks() {
  return useQuery({
    queryKey: ["books"],
    staleTime: Infinity,
    queryFn: async () => {
      const { data, error } = await supabase.from("books").select("id,name_pt,abbrev,testament,chapters").order("id");
      if (error) throw error;
      const list = data as Book[];
      return { list, byId: new Map(list.map((b) => [b.id, b])) };
    },
  });
}

export function useUserPlan(userId: string) {
  return useQuery({
    queryKey: ["user_plan", userId],
    queryFn: async () => {
      const { data, error } = await supabase.from("user_plans").select("*").eq("user_id", userId).order("id").limit(1).maybeSingle();
      if (error) throw error;
      return (data as UserPlan | null) ?? null;
    },
  });
}

export function usePlans() {
  return useQuery({
    queryKey: ["plans"],
    staleTime: Infinity,
    queryFn: async () => {
      const { data, error } = await supabase.from("plans").select("*").order("id");
      if (error) throw error;
      return data as Plan[];
    },
  });
}

export function usePlanItems(planId?: number) {
  return useQuery({
    queryKey: ["plan_items", planId],
    enabled: !!planId,
    staleTime: Infinity,
    queryFn: () =>
      fetchAll<PlanItem>((f, t) =>
        supabase.from("plan_items").select("day_number,position,book_id,chapter").eq("plan_id", planId!)
          .order("day_number").order("position").range(f, t) as any),
  });
}

export function useReadings(userId: string) {
  return useQuery({
    queryKey: ["readings", userId],
    queryFn: () =>
      fetchAll<Reading>((f, t) =>
        supabase.from("readings").select("book_id,chapter,read_at").eq("user_id", userId)
          .order("book_id").order("chapter").range(f, t) as any),
  });
}

export function useTranslation(id?: number) {
  return useQuery({
    queryKey: ["translation", id],
    enabled: !!id,
    staleTime: Infinity,
    queryFn: async () => {
      const { data, error } = await supabase.from("translations").select("*").eq("id", id!).single();
      if (error) throw error;
      return data as { id: number; code: string; name: string; attribution: string | null };
    },
  });
}

export function useVerses(translationId: number | undefined, book: number, chapter: number) {
  return useQuery({
    queryKey: ["verses", translationId, book, chapter],
    enabled: !!translationId && !!book && !!chapter,
    staleTime: Infinity,
    queryFn: async () => {
      const { data, error } = await supabase.from("verses").select("verse,text")
        .eq("translation_id", translationId!).eq("book_id", book).eq("chapter", chapter).order("verse");
      if (error) throw error;
      return data as Verse[];
    },
  });
}

export function useToggleRead(userId: string) {
  const qc = useQueryClient();
  const qk = ["readings", userId];
  return useMutation({
    mutationFn: async ({ book, chapter, read }: { book: number; chapter: number; read: boolean }) => {
      if (read) {
        const { error } = await supabase.from("readings").upsert({ user_id: userId, book_id: book, chapter }, { onConflict: "user_id,book_id,chapter" });
        if (error) throw error;
      } else {
        const { error } = await supabase.from("readings").delete().eq("user_id", userId).eq("book_id", book).eq("chapter", chapter);
        if (error) throw error;
      }
    },
    onMutate: async ({ book, chapter, read }) => {
      await qc.cancelQueries({ queryKey: qk });
      const prev = qc.getQueryData<Reading[]>(qk);
      qc.setQueryData<Reading[]>(qk, (old = []) =>
        read ? [...old.filter((r) => !(r.book_id === book && r.chapter === chapter)), { book_id: book, chapter, read_at: new Date().toISOString() }]
          : old.filter((r) => !(r.book_id === book && r.chapter === chapter)));
      return { prev };
    },
    onError: (_e, _v, ctx) => ctx?.prev && qc.setQueryData(qk, ctx.prev),
    onSettled: () => qc.invalidateQueries({ queryKey: qk }),
  });
}
