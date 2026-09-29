import { createContext, useContext, useEffect, useMemo, useRef, useState, useCallback, ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { AppRole } from "@/types/roles";
import { fetchUserRoles, upsertUserRole, signInWithPassword, signUpWithEmail, signOutUser } from "@/services/authService";

interface AuthContextType {
  user: User | null;
  session: Session | null;
  role: AppRole | null;
  loading: boolean;
  signIn: (identifier: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, fullName: string, phone?: string) => Promise<void>;
  signOut: () => Promise<void>;
  setUserRole: (role: AppRole) => Promise<void>;
  refreshRole: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const ROLE_PRIORITY: AppRole[] = ["admin", "doctor", "support", "patient"];

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [role, setRole] = useState<AppRole | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchRole = useCallback(async (userId: string) => {
    const data = await fetchUserRoles(userId);
    if (data.length > 0) {
      const roles = data.map((d) => d.role as AppRole);
      const best = ROLE_PRIORITY.find((r) => roles.includes(r)) ?? roles[0];
      setRole(best);
    } else {
      setRole(null);
    }
  }, []);

  useEffect(() => {
    // IMPORTANT: the callback must stay synchronous. Awaiting Supabase calls
    // inside onAuthStateChange holds the auth lock and deadlocks signIn.
    // Role fetches are deduped by relying ONLY on auth-state events:
    // INITIAL_SESSION covers the initial load (getSession() removed — it
    // duplicated the same role query), and TOKEN_REFRESHED is skipped
    // because the role does not change when the access token refreshes.
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        if (session?.user) {
          const userId = session.user.id;
          if (event === "TOKEN_REFRESHED") {
            setLoading(false);
            return;
          }
          setTimeout(() => {
            void fetchRole(userId).finally(() => setLoading(false));
          }, 0);
        } else {
          setRole(null);
          setLoading(false);
        }
      }
    );

    return () => subscription.unsubscribe();
  }, [fetchRole]);

  const signIn = useCallback(async (identifier: string, password: string) => {
    await signInWithPassword(identifier, password);
  }, []);

  const signUp = useCallback(
    async (email: string, password: string, fullName: string, phone?: string) => {
      await signUpWithEmail(email, password, fullName, phone);
    },
    [],
  );

  const signOut = useCallback(async () => {
    await signOutUser();
    setRole(null);
  }, []);

  const setUserRole = useCallback(
    async (newRole: AppRole) => {
      if (!user) throw new Error("Not authenticated");
      await upsertUserRole(user.id, newRole);
      setRole(newRole);
    },
    [user],
  );

  const refreshRole = useCallback(async () => {
    if (!user) return;
    await fetchRole(user.id);
  }, [user, fetchRole]);

  const value = useMemo(
    () => ({ user, session, role, loading, signIn, signUp, signOut, setUserRole, refreshRole }),
    [user, session, role, loading, signIn, signUp, signOut, setUserRole, refreshRole],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
