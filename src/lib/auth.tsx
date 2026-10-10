import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import type { Session } from "@supabase/supabase-js";
import { supabase, urlHadRecovery } from "./supabase";

const Ctx = createContext<{ session: Session | null; loading: boolean; recovery: boolean }>({ session: null, loading: true, recovery: false });

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [recovery, setRecovery] = useState(urlHadRecovery);
  useEffect(() => {
    const { data } = supabase.auth.onAuthStateChange((e, s) => { setSession(s); if (e === "PASSWORD_RECOVERY") setRecovery(true); });
    supabase.auth.getSession().then(({ data }) => { setSession(data.session); setLoading(false); });
    return () => data.subscription.unsubscribe();
  }, []);
  return <Ctx.Provider value={{ session, loading, recovery }}>{children}</Ctx.Provider>;
}

export const useAuth = () => useContext(Ctx);
