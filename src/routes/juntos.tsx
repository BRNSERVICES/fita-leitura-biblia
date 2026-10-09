import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Shell, Loading, ErrorBox } from "@/components/ui-fita";
import { supabase } from "@/lib/supabase";
import { saveProfile, useProfile } from "@/lib/data";

export const Route = createFileRoute("/juntos")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Juntos — Fita" },
      { name: "description", content: "Leia a Bíblia junto com quem você ama." },
      { property: "og:title", content: "Juntos — Fita" },
      { property: "og:description", content: "Leia a Bíblia junto com quem você ama." },
    ],
  }),
  component: () => <Shell>{(c) => <Together userId={c.userId} />}</Shell>,
});

type Member = { user_id: string; display_name: string; streak: number; current_ref: string | null; read_today: boolean; is_me: boolean };

export function pairErrorMsg(e: unknown) {
  const m = String((e as { message?: string })?.message ?? e);
  if (m.includes("invalid_code")) return "Esse código não é válido ou já expirou. Peça um novo convite.";
  if (m.includes("pair_full")) return "Esse grupo já está completo (máximo de 8 pessoas).";
  if (m.includes("not_authenticated")) return "Entre na sua conta para continuar.";
  return "Algo não deu certo. Tente de novo.";
}

function usePairs(userId: string) {
  return useQuery({
    queryKey: ["pairs", userId],
    queryFn: async () => {
      const { data: pm, error } = await supabase.from("pair_members").select("pair_id").eq("user_id", userId);
      if (error) throw error;
      const ids = (pm ?? []).map((r: { pair_id: string }) => r.pair_id);
      if (!ids.length) return [] as { id: string; name: string }[];
      const { data, error: e2 } = await supabase.from("pairs").select("id,name").in("id", ids);
      if (e2) throw e2;
      return data as { id: string; name: string }[];
    },
  });
}

export function NameForm({ userId, initial = "", onDone, cta = "Salvar" }: { userId: string; initial?: string; onDone?: () => void; cta?: string }) {
  const qc = useQueryClient();
  const [name, setName] = useState(initial);
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const n = name.trim();
    if (n.length < 1 || n.length > 40) return setErr("Use de 1 a 40 caracteres.");
    setBusy(true); setErr("");
    try { await saveProfile(userId, n); await qc.invalidateQueries({ queryKey: ["profile", userId] }); onDone?.(); }
    catch { setErr("Não foi possível salvar o nome."); }
    setBusy(false);
  }
  return (
    <form onSubmit={submit} className="flex gap-2">
      <label className="flex-1"><span className="sr-only">Nome de exibição</span>
        <input value={name} maxLength={40} onChange={(e) => setName(e.target.value)} placeholder="Como quer ser chamado?" className="btn-ghost w-full px-3 py-2" /></label>
      <button disabled={busy} className="btn-primary px-4 py-2 text-sm">{busy ? "…" : cta}</button>
      {err && <p role="alert" className="sr-only">{err}</p>}
      {err && <span className="sr-only" />}
      {err && <p className="basis-full text-sm text-ribbon" aria-hidden>{err}</p>}
    </form>
  );
}

function Together({ userId }: { userId: string }) {
  const profile = useProfile(userId);
  const pairs = usePairs(userId);
  if (profile.isLoading || pairs.isLoading) return <Loading />;
  if (profile.isError || pairs.isError) return <ErrorBox onRetry={() => { profile.refetch(); pairs.refetch(); }} />;

  return (
    <div className="space-y-5">
      <header>
        <h1 className="font-serif text-3xl font-semibold">Juntos</h1>
        <p className="mt-1 text-sm text-ink-2">Ler acompanhado faz bem. Um incentiva o outro.</p>
      </header>
      {!profile.data ? (
        <section className="card-fita p-5">
          <h2 className="mb-1 font-serif text-lg">Primeiro, seu nome</h2>
          <p className="mb-3 text-sm text-ink-2">É assim que as pessoas do grupo vão te ver.</p>
          <NameForm userId={userId} cta="Continuar" />
        </section>
      ) : pairs.data!.length === 0 ? (
        <NoPair userId={userId} />
      ) : (
        <>
          {pairs.data!.map((p) => <PairCard key={p.id} pair={p} userId={userId} />)}
          <details className="card-fita p-4">
            <summary className="cursor-pointer text-sm font-medium">Criar ou entrar em outro grupo</summary>
            <div className="mt-4"><NoPair userId={userId} /></div>
          </details>
        </>
      )}
    </div>
  );
}

function NoPair({ userId }: { userId: string }) {
  const qc = useQueryClient();
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [msg, setMsg] = useState<{ which: "c" | "j"; t: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const refresh = () => qc.invalidateQueries({ queryKey: ["pairs", userId] });

  async function create(e: React.FormEvent) {
    e.preventDefault(); if (!name.trim()) return;
    setBusy(true); setMsg(null);
    const { error } = await supabase.rpc("create_pair", { p_name: name.trim() });
    setBusy(false);
    if (error) setMsg({ which: "c", t: pairErrorMsg(error) }); else { setName(""); refresh(); }
  }
  async function join(e: React.FormEvent) {
    e.preventDefault(); if (!code.trim()) return;
    setBusy(true); setMsg(null);
    const { error } = await supabase.rpc("join_pair", { p_code: code.trim() });
    setBusy(false);
    if (error) setMsg({ which: "j", t: pairErrorMsg(error) }); else { setCode(""); refresh(); }
  }
  return (
    <div className="space-y-4">
      <form onSubmit={create} className="card-fita space-y-3 p-5">
        <h2 className="font-serif text-lg">Criar um grupo</h2>
        <label className="block"><span className="text-sm text-ink-2">Nome do grupo</span>
          <input value={name} maxLength={60} onChange={(e) => setName(e.target.value)} placeholder="Eu e a Marta" className="btn-ghost mt-1 w-full px-3 py-2" /></label>
        {msg?.which === "c" && <p role="alert" className="text-sm text-ribbon">{msg.t}</p>}
        <button disabled={busy || !name.trim()} className="btn-primary w-full py-3">Criar grupo</button>
      </form>
      <form onSubmit={join} className="card-fita space-y-3 p-5">
        <h2 className="font-serif text-lg">Entrar com um código</h2>
        <label className="block"><span className="text-sm text-ink-2">Código de convite</span>
          <input value={code} onChange={(e) => setCode(e.target.value)} autoCapitalize="characters" className="btn-ghost mt-1 w-full px-3 py-2 tracking-widest" /></label>
        {msg?.which === "j" && <p role="alert" className="text-sm text-ribbon">{msg.t}</p>}
        <button disabled={busy || !code.trim()} className="btn-ghost w-full py-3 font-medium">Entrar no grupo</button>
      </form>
    </div>
  );
}

function PairCard({ pair, userId }: { pair: { id: string; name: string }; userId: string }) {
  const qc = useQueryClient();
  const status = useQuery({
    queryKey: ["pair_status", pair.id],
    staleTime: 0,
    queryFn: async () => {
      const { data, error } = await supabase.rpc("pair_status", { p_pair: pair.id });
      if (error) throw error;
      return (data ?? []) as Member[];
    },
  });
  const [note, setNote] = useState("");
  const [confirmLeave, setConfirmLeave] = useState(false);

  async function invite() {
    setNote("");
    const { data, error } = await supabase.rpc("new_invite", { p_pair: pair.id });
    if (error) return setNote(pairErrorMsg(error));
    const code = typeof data === "string" ? data : (data as { code?: string })?.code ?? String(data);
    const link = `${window.location.origin}/entrar?codigo=${encodeURIComponent(code)}`;
    const text = `Vamos ler a Bíblia juntos? Entre no meu grupo no Fita: ${link}`;
    try {
      if (navigator.share) { await navigator.share({ title: "Fita", text }); return; }
    } catch (e) { if ((e as Error).name === "AbortError") return; }
    try { await navigator.clipboard.writeText(text); setNote("Convite copiado. Agora é só colar na conversa."); }
    catch { setNote(`Código do convite: ${code}`); }
  }
  async function leave() {
    const { error } = await supabase.rpc("leave_pair", { p_pair: pair.id });
    if (error) return setNote(pairErrorMsg(error));
    qc.invalidateQueries({ queryKey: ["pairs", userId] });
  }

  const members = status.data ?? [];
  const best = members.reduce<Member | null>((a, m) => (m.streak > (a?.streak ?? 0) ? m : a), null);

  return (
    <section className="card-fita p-5" aria-labelledby={`p-${pair.id}`}>
      <div className="mb-3 flex items-center justify-between gap-2">
        <h2 id={`p-${pair.id}`} className="font-serif text-xl font-semibold">{pair.name}</h2>
        <button onClick={() => status.refetch()} aria-label="Atualizar" className="btn-ghost px-3 py-1.5 text-sm" disabled={status.isFetching}>
          {status.isFetching ? "…" : "Atualizar"}
        </button>
      </div>
      {status.isLoading ? <Loading /> : status.isError ? <ErrorBox onRetry={() => status.refetch()} /> : (
        <>
          <ul className="divide-y divide-thread">
            {members.map((m) => {
              const nm = m.is_me ? "Você" : m.display_name || "Alguém";
              return (
                <li key={m.user_id} className="flex items-center gap-3 py-3">
                  <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-page font-serif text-lg font-semibold" aria-hidden>
                    {(m.display_name || nm).charAt(0).toUpperCase()}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="font-medium">{nm}</p>
                    <p className="text-sm text-ink-2">{m.streak} {m.streak === 1 ? "dia seguido" : "dias seguidos"}{m.current_ref ? ` · Lendo agora: ${m.current_ref}` : ""}</p>
                  </div>
                  {m.read_today && (
                    <span className="flex items-center gap-1.5 text-xs text-leaf"><span className="h-2.5 w-2.5 rounded-full bg-leaf" aria-hidden />Leu hoje</span>
                  )}
                </li>
              );
            })}
          </ul>
          {best && best.streak > 1 && members.length > 1 && (
            <p className="mt-3 text-sm text-ink-2">{best.is_me ? "Você está" : `${best.display_name} está`} há {best.streak} dias seguidos na leitura. Que bonito!</p>
          )}
        </>
      )}
      {note && <p role="status" className="mt-3 text-sm text-ink-2">{note}</p>}
      <div className="mt-4 flex gap-2">
        <button onClick={invite} className="btn-primary flex-1 py-3">Convidar</button>
        {!confirmLeave ? (
          <button onClick={() => setConfirmLeave(true)} className="btn-ghost px-4 py-3 text-sm">Sair do grupo</button>
        ) : (
          <div role="alertdialog" aria-label="Confirmar saída" className="flex gap-2">
            <button onClick={leave} className="btn-ghost px-3 py-3 text-sm text-ribbon">Confirmar</button>
            <button onClick={() => setConfirmLeave(false)} className="btn-ghost px-3 py-3 text-sm">Cancelar</button>
          </div>
        )}
      </div>
    </section>
  );
}
