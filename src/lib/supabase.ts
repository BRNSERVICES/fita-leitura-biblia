import { createClient } from "@supabase/supabase-js";

// Captured before the client consumes the URL tokens.
const initialUrl = typeof window !== "undefined" ? window.location.href : "";
export const urlHadRecovery =
  /type=recovery/.test(initialUrl) || (initialUrl.includes("/redefinir-senha") && /[?&#](code|access_token)=/.test(initialUrl));
export const urlHadAuthError = /[?&#](error|error_code)=/.test(initialUrl);

export const supabase = createClient(
  import.meta.env["VITE_SUPABASE_URL"] as string,
  import.meta.env["VITE_SUPABASE_PUBLISHABLE_KEY"] as string,
  {
    auth: {
      persistSession: typeof window !== "undefined",
      autoRefreshToken: typeof window !== "undefined",
      storage: typeof window !== "undefined" ? window.localStorage : undefined,
    },
  },
);
