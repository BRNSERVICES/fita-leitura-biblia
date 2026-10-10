import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Frame, Loading } from "@/components/ui-fita";
import { useAuth } from "@/lib/auth";
import { supabase, urlHadAuthError, urlHadRecovery } from "@/lib/supabase";

export const Route = createFileRoute("/redefinir-senha")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Criar nova senha — Fita" },
      { name: "description", content: "Crie uma nova senha para sua conta no Fita." },
      { property: "og:title", content: "Criar nova senha — Fita" },
      { property: "og:description", content: "Crie uma nova senha para sua conta no Fita." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: ResetPage,
});

function ResetPage() {
  const { session, loading, recovery } = useAuth();
  const nav = useNavigate();
  const [timedOut, setTimedOut] = useState(false);
  const [pw, setPw] = useState("");
  const [pw2, setPw2] = useState("");
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [done, setDone] = useState(false);

  // Give the client time to exchange the link's tokens on first open.
  useEffect(() => { const t = setTimeout(() => setTimedOut(true), 6000); return () => clearTimeout(t); }, []);

  const valid = !!session && recovery && !urlHadAuthError;
  const waiting = !valid && !urlHadAuthError && (loading || (urlHadRecovery && !timedOut));

  async function submit(e: React.FormEvent) {
    e.preventDefault(); setErr("");
    if (pw.length < 10) return setErr("A senha precisa ter ao menos 10 caracteres.");
    if (pw !== pw2) return setErr("As duas senhas não são iguais.");
    setBusy(true);
    try {
      const { error } = await supabase.auth.updateUser({ password: pw });
      if (error) setErr(/fetch|network/i.test(error.message) ? "Sem conexão no momento. Tente de novo." : /same|different/i.test(error.message) ? "Escolha uma senha diferente da anterior." : "Não foi possível atualizar a senha. Tente de novo.");
      else { setDone(true); setTimeout(() => nav({ to: "/", replace: true }), 1500); }
    } catch { setErr("Sem conexão no momento. Tente de novo."); }
    setBusy(false);
  }

  if (done) return (
    <Frame><div role="status" className="card-fita mt-16 p-6 text-center">
      <p className="font-serif text-2xl font-semibold">Senha atualizada</p>
      <p className="mt-2 text-sm text-ink-2">Levando você para a leitura de hoje…</p>
    </div></Frame>
  );
  if (waiting) return <Frame><Loading label="Verificando o link…" /></Frame>;
  if (!valid) return (
    <Frame><div role="alert" className="card-fita mt-16 p-6 text-center">
      <p className="font-serif text-2xl font-semibold">Esse link não é mais válido</p>
      <p className="mt-2 text-sm text-ink-2">Os links duram pouco tempo. Peça outro e use o mais recente.</p>
      <a href="/auth?modo=recuperar" className="btn-primary mt-5 inline-block px-5 py-3">Pedir outro link</a>
    </div></Frame>
  );

  const type = show ? "text" : "password";
  return (
    <Frame>
      <form onSubmit={submit} className="mt-10 space-y-4" noValidate>
        <div className="ribbon h-14" aria-hidden />
        <h1 className="font-serif text-3xl font-semibold">Criar nova senha</h1>
        <label className="block"><span className="text-sm text-ink-2">Nova senha</span>
          <input type={type} value={pw} onChange={(e) => setPw(e.target.value)} autoComplete="new-password" required minLength={10}
            aria-describedby="regra" aria-invalid={!!err && pw.length < 10} className="btn-ghost mt-1 w-full px-4 py-3" />
          <span id="regra" className="mt-1 block text-xs text-ink-2">Mínimo de 10 caracteres.</span>
        </label>
        <label className="block"><span className="text-sm text-ink-2">Confirme a nova senha</span>
          <input type={type} value={pw2} onChange={(e) => setPw2(e.target.value)} autoComplete="new-password" required
            aria-invalid={!!err && pw !== pw2} className="btn-ghost mt-1 w-full px-4 py-3" />
        </label>
        <button type="button" onClick={() => setShow(!show)} aria-pressed={show} className="text-sm text-ink-2 underline">
          {show ? "Ocultar senha" : "Mostrar senha"}
        </button>
        {err && <p role="alert" className="text-sm text-ribbon">{err}</p>}
        <button disabled={busy} className="btn-primary w-full py-4">{busy ? "Salvando…" : "Salvar nova senha"}</button>
        <Link to="/" className="block text-center text-sm text-ink-2 underline">Cancelar</Link>
      </form>
    </Frame>
  );
}
