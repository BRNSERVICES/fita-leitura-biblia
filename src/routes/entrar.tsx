import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Frame, Loading } from "@/components/ui-fita";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/lib/supabase";
import { saveProfile, useProfile } from "@/lib/data";
import { pairErrorMsg } from "./juntos";

export const Route = createFileRoute("/entrar")({
  ssr: false,
  validateSearch: (s: Record<string, unknown>) => ({ codigo: typeof s["codigo"] === "string" ? (s["codigo"] as string) : undefined }),
  head: () => ({
    meta: [
      { title: "Convite para ler junto — Fita" },
      { name: "description", content: "Você foi convidado para ler a Bíblia junto no Fita." },
      { property: "og:title", content: "Convite para ler junto — Fita" },
      { property: "og:description", content: "Você foi convidado para ler a Bíblia junto no Fita." },
    ],
  }),
  component: JoinPage,
});

function JoinPage() {
  const { codigo } = Route.useSearch();
  const { session, loading } = useAuth();
  const nav = useNavigate();
  const qc = useQueryClient();
  const userId = session?.user.id ?? "";
  const profile = useProfile(userId);
  const [err, setErr] = useState("");
  const [name, setName] = useState("");
  const ran = useRef(false);

  useEffect(() => { if (codigo) sessionStorage.setItem("fita-codigo", codigo); }, [codigo]);
  useEffect(() => { if (!loading && !session) nav({ to: "/auth", replace: true }); }, [loading, session, nav]);

  useEffect(() => {
    if (!session || profile.isLoading || !profile.data || ran.current) return;
    const code = codigo ?? sessionStorage.getItem("fita-codigo");
    if (!code) { nav({ to: "/juntos", replace: true }); return; }
    ran.current = true;
    supabase.rpc("join_pair", { p_code: code }).then(({ error }) => {
      sessionStorage.removeItem("fita-codigo");
      if (error) setErr(pairErrorMsg(error));
      else { qc.invalidateQueries({ queryKey: ["pairs", userId] }); nav({ to: "/juntos", replace: true }); }
    });
  }, [session, profile.isLoading, profile.data, codigo, nav, qc, userId]);

  if (loading || !session || profile.isLoading) return <Frame><Loading label="Entrando no grupo…" /></Frame>;

  if (err) return (
    <Frame>
      <div role="alert" className="card-fita mt-10 p-5 text-center">
        <p className="font-serif text-lg">{err}</p>
        <Link to="/juntos" className="btn-primary mt-4 inline-block px-5 py-3">Ir para Juntos</Link>
      </div>
    </Frame>
  );

  if (!profile.data) return (
    <Frame>
      <form className="mt-10 space-y-3" onSubmit={async (e) => {
        e.preventDefault(); const n = name.trim();
        if (n.length < 1 || n.length > 40) return setErr("");
        try { await saveProfile(userId, n); qc.invalidateQueries({ queryKey: ["profile", userId] }); } catch { setErr("Não foi possível salvar o nome."); }
      }}>
        <h1 className="font-serif text-2xl font-semibold">Você foi convidado para ler junto</h1>
        <p className="text-sm text-ink-2">Antes, como quer ser chamado no grupo?</p>
        <label className="block"><span className="sr-only">Nome de exibição</span>
          <input value={name} maxLength={40} onChange={(e) => setName(e.target.value)} className="btn-ghost w-full px-4 py-3" /></label>
        <button disabled={!name.trim()} className="btn-primary w-full py-4">Entrar no grupo</button>
      </form>
    </Frame>
  );

  return <Frame><Loading label="Entrando no grupo…" /></Frame>;
}
