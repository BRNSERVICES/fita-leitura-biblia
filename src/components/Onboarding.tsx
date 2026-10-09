import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { PLAN_BLURB, spDate, usePlans } from "@/lib/data";
import { ErrorBox, Loading } from "./ui-fita";

export function Onboarding({ userId }: { userId: string }) {
  const plans = usePlans();
  const qc = useQueryClient();
  const [planId, setPlanId] = useState<number | null>(null);
  const [start, setStart] = useState(spDate());
  const [time, setTime] = useState("07:00");
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");

  if (plans.isLoading) return <Loading />;
  if (plans.isError) return <ErrorBox onRetry={() => plans.refetch()} />;
  const chosen = planId ?? plans.data?.[0]?.id ?? null;

  async function save() {
    if (!chosen) return;
    setSaving(true); setErr("");
    const { error } = await supabase.from("user_plans").insert({ user_id: userId, plan_id: chosen, translation_id: 1, start_date: start, reminder_time: time });
    setSaving(false);
    if (error) return setErr("Não foi possível salvar. Tente de novo.");
    qc.invalidateQueries({ queryKey: ["user_plan", userId] });
  }

  return (
    <div className="space-y-6">
      <header>
        <p className="text-sm text-ink-2">Bem-vindo ao Fita</p>
        <h1 className="mt-1 font-serif text-3xl font-semibold">Vamos começar sua leitura</h1>
      </header>
      <fieldset className="space-y-2">
        <legend className="mb-2 text-sm font-medium text-ink-2">Plano</legend>
        {plans.data!.map((p) => (
          <label key={p.id} className={`card-fita flex cursor-pointer items-center gap-3 p-4 ${chosen === p.id ? "border-ink" : ""}`}>
            <input type="radio" name="plan" checked={chosen === p.id} onChange={() => setPlanId(p.id)} className="accent-[var(--ink)]" />
            <span><span className="block font-serif text-lg">{p.name}</span><span className="text-sm text-ink-2">{PLAN_BLURB[p.id] ?? `${p.total_days} dias`}</span></span>
          </label>
        ))}
      </fieldset>
      <label className="block">
        <span className="text-sm font-medium text-ink-2">Data de início</span>
        <input type="date" value={start} onChange={(e) => setStart(e.target.value)} className="btn-ghost mt-2 w-full px-4 py-3" />
      </label>
      <label className="block">
        <span className="text-sm font-medium text-ink-2">Horário do lembrete</span>
        <input type="time" value={time} onChange={(e) => setTime(e.target.value)} className="btn-ghost mt-2 w-full px-4 py-3" />
      </label>
      {err && <p role="alert" className="text-sm text-ribbon">{err}</p>}
      <button onClick={save} disabled={saving || !chosen || !start} className="btn-primary w-full py-4 text-base">
        {saving ? "Salvando…" : "Começar"}
      </button>
    </div>
  );
}
