import { createFileRoute, Navigate } from "@tanstack/react-router";
import { useState } from "react";
import { Frame, Loading } from "@/components/ui-fita";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/lib/auth";

export const Route = createFileRoute("/auth")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Entrar — Fita" },
      { name: "description", content: "Entre no Fita para acompanhar sua leitura da Bíblia." },
      { property: "og:title", content: "Entrar — Fita" },
      { property: "og:description", content: "Entre no Fita para acompanhar sua leitura da Bíblia." },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const { session, loading } = useAuth();
  const [mode, setMode] = useState<"in" | "up">("in");
  const [email, setEmail] = useState("");
  const [pw, setPw] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ t: string; err?: boolean } | null>(null);
  if (loading) return <Frame><Loading /></Frame>;
  if (session) return (sessionStorage.getItem("fita-codigo") ? <Navigate to="/entrar" search={{ codigo: undefined }} /> : <Navigate to="/" />);

  async function submit(e: React.FormEvent) {
    e.preventDefault(); setBusy(true); setMsg(null);
    if (mode === "in") {
      const { error } = await supabase.auth.signInWithPassword({ email, password: pw });
      if (error) setMsg({ t: "E-mail ou senha não conferem.", err: true });
    } else {
      const { data, error } = await supabase.auth.signUp({ email, password: pw, options: { emailRedirectTo: window.location.origin } });
      if (error) setMsg({ t: error.message.includes("Password") ? "A senha precisa ter ao menos 6 caracteres." : "Não foi possível criar a conta.", err: true });
      else if (!data.session) setMsg({ t: "Conta criada. Confira seu e-mail para confirmar e depois entre." });
    }
    setBusy(false);
  }

  return (
    <Frame>
      <div className="flex min-h-[80vh] flex-col justify-center">
        <div className="ribbon mb-6 h-16" aria-hidden />
        <h1 className="font-serif text-4xl font-semibold">Fita</h1>
        <p className="mt-2 text-ink-2">Um capítulo de cada vez, todos os dias.</p>
        <form onSubmit={submit} className="mt-8 space-y-3">
          <label className="block"><span className="text-sm text-ink-2">E-mail</span>
            <input type="email" required autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} className="btn-ghost mt-1 w-full px-4 py-3" /></label>
          <label className="block"><span className="text-sm text-ink-2">Senha</span>
            <input type="password" required minLength={6} autoComplete={mode === "in" ? "current-password" : "new-password"} value={pw} onChange={(e) => setPw(e.target.value)} className="btn-ghost mt-1 w-full px-4 py-3" /></label>
          {msg && <p role={msg.err ? "alert" : "status"} className={`text-sm ${msg.err ? "text-ribbon" : "text-leaf"}`}>{msg.t}</p>}
          <button disabled={busy} className="btn-primary w-full py-4">{busy ? "Aguarde…" : mode === "in" ? "Entrar" : "Criar conta"}</button>
        </form>
        <button onClick={() => { setMode(mode === "in" ? "up" : "in"); setMsg(null); }} className="mt-4 text-sm text-ink-2 underline">
          {mode === "in" ? "Ainda não tem conta? Criar conta" : "Já tem conta? Entrar"}
        </button>
      </div>
    </Frame>
  );
}
