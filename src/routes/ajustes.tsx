import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Shell, Loading, ErrorBox } from "@/components/ui-fita";
import { supabase } from "@/lib/supabase";
import { useTranslation, type UserPlan } from "@/lib/data";
import { applyTheme, type ThemeMode } from "@/lib/theme";

export const Route = createFileRoute("/ajustes")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Ajustes — Fita" },
      { name: "description", content: "Tradução, lembrete e aparência do Fita." },
      { property: "og:title", content: "Ajustes — Fita" },
      { property: "og:description", content: "Tradução, lembrete e aparência do Fita." },
    ],
  }),
  component: () => <Shell>{(c) => <Settings {...c} />}</Shell>,
});

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <h2 className="mb-2 px-1 text-sm font-medium text-ink-2">{title}</h2>
      <div className="card-fita p-4">{children}</div>
    </section>
  );
}

function Settings({ userId, up }: { userId: string; up: UserPlan }) {
  const tr = useTranslation(up.translation_id);
  const qc = useQueryClient();
  const nav = useNavigate();
  const [time, setTime] = useState((up.reminder_time ?? "07:00").slice(0, 5));
  const [msg, setMsg] = useState("");
  const [theme, setTheme] = useState<ThemeMode>("system");
  useEffect(() => setTheme((localStorage.getItem("fita-theme") as ThemeMode) || "system"), []);

  async function saveTime() {
    setMsg("");
    const { error } = await supabase.from("user_plans").update({ reminder_time: time }).eq("id", up.id).eq("user_id", userId);
    setMsg(error ? "Não foi possível salvar." : "Horário salvo.");
    if (!error) qc.invalidateQueries({ queryKey: ["user_plan", userId] });
  }
  async function signOut() {
    await qc.cancelQueries(); qc.clear();
    await supabase.auth.signOut();
    nav({ to: "/auth", replace: true });
  }

  return (
    <div className="space-y-6">
      <h1 className="font-serif text-3xl font-semibold">Ajustes</h1>

      <Section title="Tradução">
        <div role="radiogroup" aria-label="Tradução" className="divide-y divide-thread">
          <div role="radio" aria-checked="true" className="flex items-center justify-between py-2">
            <span>Bíblia Livre</span><span className="h-4 w-4 rounded-full border-[5px] border-ink" aria-hidden />
          </div>
          <div role="radio" aria-checked="false" aria-disabled="true" className="flex items-center justify-between py-2 text-ink-2">
            <span>Tradução Brasileira de 1917</span><span className="text-xs">Em breve</span>
          </div>
        </div>
      </Section>

      <Section title="Lembrete">
        <div className="flex items-center gap-3">
          <label className="flex-1"><span className="sr-only">Horário do lembrete</span>
            <input type="time" value={time} onChange={(e) => setTime(e.target.value)} className="btn-ghost w-full px-3 py-2" />
          </label>
          <button onClick={saveTime} className="btn-primary px-4 py-2 text-sm">Salvar</button>
        </div>
        {msg && <p role="status" className="mt-2 text-sm text-ink-2">{msg}</p>}
      </Section>

      <Section title="Aparência">
        <div role="radiogroup" aria-label="Tema" className="grid grid-cols-3 gap-2">
          {([["system", "Sistema"], ["light", "Claro"], ["dark", "Escuro"]] as const).map(([v, l]) => (
            <button key={v} role="radio" aria-checked={theme === v} onClick={() => { setTheme(v); applyTheme(v); }}
              className={`rounded-[14px] border py-2 text-sm ${theme === v ? "border-ink bg-ink text-paper" : "border-thread"}`}>{l}</button>
          ))}
        </div>
      </Section>

      <Section title="Sobre o texto bíblico">
        {tr.isLoading ? <Loading /> : tr.isError ? <ErrorBox onRetry={() => tr.refetch()} /> :
          <p className="whitespace-pre-line font-serif text-sm leading-relaxed text-ink-2">{tr.data?.attribution || tr.data?.name}</p>}
      </Section>

      <button onClick={signOut} className="btn-ghost w-full py-3 font-medium">Sair</button>
    </div>
  );
}
