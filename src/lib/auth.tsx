import type { User } from "@supabase/supabase-js";
import { useQueryClient } from "@tanstack/react-query";
import { useRouter } from "@tanstack/react-router";
import { createContext, useContext, useEffect, useState, type ReactNode } from "react";

import { supabase } from "@/integrations/supabase/client";

interface AuthState {
  user: User | null;
  ready: boolean;
  /** Shows the admin link; the admin pages and data are protected separately on the server. */
  isAdmin: boolean;
}

const AuthContext = createContext<AuthState>({ user: null, ready: false, isAdmin: false });

export async function checkIsAdmin(userId: string): Promise<boolean> {
  const { data } = await supabase.rpc("has_role", { _user_id: userId, _role: "admin" });
  return data === true;
}

/** The single place that listens to sign-in / sign-out for the whole site. */
export function AuthProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [state, setState] = useState<AuthState>({ user: null, ready: false, isAdmin: false });

  useEffect(() => {
    let alive = true;
    const apply = (user: User | null) => {
      setState((s) => ({
        user,
        ready: true,
        isAdmin: user && s.user?.id === user.id ? s.isAdmin : false,
      }));
      if (user) {
        checkIsAdmin(user.id)
          .then(
            (isAdmin) => alive && setState((s) => (s.user?.id === user.id ? { ...s, isAdmin } : s)),
          )
          .catch(() => undefined);
      }
    };
    supabase.auth.getSession().then(({ data }) => apply(data.session?.user ?? null));
    const { data } = supabase.auth.onAuthStateChange((event, session) => {
      if (event !== "SIGNED_IN" && event !== "SIGNED_OUT" && event !== "USER_UPDATED") return;
      apply(session?.user ?? null);
      router.invalidate();
      if (event !== "SIGNED_OUT") queryClient.invalidateQueries();
      else queryClient.clear();
    });
    return () => {
      alive = false;
      data.subscription.unsubscribe();
    };
  }, [router, queryClient]);

  return <AuthContext.Provider value={state}>{children}</AuthContext.Provider>;
}

export const useAuth = () => useContext(AuthContext);
