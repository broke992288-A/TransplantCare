import { createContext, useContext, useEffect, useMemo, useState, useCallback, ReactNode } from "react";
import { User, Session } from "@supabase/supabase-js";
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

// Module-level in-flight role query cache: Supabase may emit several auth
// events on boot (INITIAL_SESSION, SIGNED_IN) and the AuthProvider can remount
// (HMR, route remounts) — a ref-based dedup loses the in-flight promise in
// both cases. This collapses ALL of them into ONE user_roles query per user
// per page load (with a short TTL). refreshRole(force=true) bypasses the cache.
interface RoleQueryCache {
  userId: string;
  promise: Promise<AppRole | null>;
  at: number;
}
const ROLE_CACHE_TTL_MS = 5 * 60 * 1000;
let roleQueryCache: RoleQueryCache | null = null;

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [role, setRole] = useState<AppRole | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchRole = useCallback(async (userId: string, force = false) => {
    let promise: Promise<AppRole | null>;
    const cached = roleQueryCache;
    if (!force && cached && cached.userId === userId && Date.now() - cached.at < ROLE_CACHE_TTL_MS) {
      promise = cached.promise;
    } else {
      promise = fetchUserRoles(userId).then((data) => {
        if (data.length > 0) {
          const roles = data.map((d) => d.role as AppRole);
          const best = ROLE_PRIORITY.find((r) => roles.includes(r)) ?? roles[0];
          return best;
        }
        return null;
      });
      roleQueryCache = { userId, promise, at: Date.now() };
      promise.catch(() => {
        if (roleQueryCache?.promise === promise) roleQueryCache = null;
      });
    }
    try {
      const best = await promise;
      setRole(best);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // IMPORTANT: the callback must stay synchronous. Awaiting Supabase calls
    // inside onAuthStateChange holds the auth lock and deadlocks signIn.
    // Role fetches are deduped by the module-level cache above:
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
            void fetchRole(userId);
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
    roleQueryCache = null;
    setRole(null);
  }, []);

  const setUserRole = useCallback(
    async (newRole: AppRole) => {
      if (!user) throw new Error("Not authenticated");
      await upsertUserRole(user.id, newRole);
      roleQueryCache = null;
      setRole(newRole);
    },
    [user],
  );

  const refreshRole = useCallback(async () => {
    if (!user) return;
    await fetchRole(user.id, true);
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
