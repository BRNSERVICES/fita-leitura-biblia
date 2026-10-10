import { createFileRoute, Navigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
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
  const [mode, setMode] = useState<"in" | "up" | "forgot">(() =>
    typeof window !== "undefined" && new URLSearchParams(window.location.search).get("modo") === "recuperar" ? "forgot" : "in");
  const [wait, setWait] = useState(0);
  useEffect(() => { if (wait <= 0) return; const t = setTimeout(() => setWait((w) => w - 1), 1000); return () => clearTimeout(t); }, [wait]);
  const [email, setEmail] = useState("");
  const [pw, setPw] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ t: string; err?: boolean } | null>(null);
  if (loading) return <Frame><Loading /></Frame>;
  if (session) return (sessionStorage.getItem("fita-codigo") ? <Navigate to="/entrar" search={{ codigo: undefined }} /> : <Navigate to="/" />);

  async function submit(e: React.FormEvent) {
    e.preventDefault(); setBusy(true); setMsg(null);
    if (mode === "forgot") {
      if (wait > 0) { setBusy(false); return; }
      try {
        const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo: window.location.origin + "/redefinir-senha" });
        if (error && /fetch|network/i.test(error.message)) throw error;
        setMsg({ t: "Se esse e-mail tiver conta, enviamos um link para criar uma nova senha. Olhe também o spam." });
        setWait(60);
      } catch {
        setMsg({ t: "Sem conexão no momento. Verifique sua internet e tente de novo.", err: true });
      }
      setBusy(false); return;
    }
    if (mode === "up" && pw.length < 10) { setMsg({ t: "A senha precisa ter ao menos 10 caracteres.", err: true }); setBusy(false); return; }
    if (mode === "in") {
      const { error } = await supabase.auth.signInWithPassword({ email, password: pw });
      if (error) setMsg({ t: "E-mail ou senha não conferem.", err: true });
    } else {
      const { data, error } = await supabase.auth.signUp({ email, password: pw, options: { emailRedirectTo: window.location.origin } });
      if (error) setMsg({ t: error.message.includes("Password") ? "A senha precisa ter ao menos 10 caracteres." : "Não foi possível criar a conta.", err: true });
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
          {mode === "forgot" ? (
            <p className="text-sm text-ink-2">Digite seu e-mail e enviaremos um link para criar uma nova senha.</p>
          ) : (
            <label className="block"><span className="text-sm text-ink-2">Senha</span>
              <input type="password" required minLength={mode === "up" ? 10 : 1} aria-describedby={mode === "up" ? "regra-senha" : undefined}
                autoComplete={mode === "in" ? "current-password" : "new-password"} value={pw} onChange={(e) => setPw(e.target.value)} className="btn-ghost mt-1 w-full px-4 py-3" />
              {mode === "up" && <span id="regra-senha" className="mt-1 block text-xs text-ink-2">Mínimo de 10 caracteres.</span>}
            </label>
          )}
          {mode === "in" && (
            <button type="button" onClick={() => { setMode("forgot"); setMsg(null); }} className="text-sm text-ink-2 underline">Esqueci minha senha</button>
          )}
          {msg && <p role={msg.err ? "alert" : "status"} className={`text-sm ${msg.err ? "text-ribbon" : "text-leaf"}`}>{msg.t}</p>}
          <button disabled={busy || (mode === "forgot" && wait > 0)} aria-live="polite" className="btn-primary w-full py-4">
            {busy ? "Aguarde…" : mode === "in" ? "Entrar" : mode === "up" ? "Criar conta" : wait > 0 ? `Reenviar em ${wait}s` : "Enviar link"}
          </button>
        </form>
        <button onClick={() => { setMode(mode === "in" ? "up" : "in"); setMsg(null); }} className="mt-4 text-sm text-ink-2 underline">
          {mode === "in" ? "Ainda não tem conta? Criar conta" : mode === "up" ? "Já tem conta? Entrar" : "Voltar para o login"}
        </button>
      </div>
    </Frame>
  );
}
