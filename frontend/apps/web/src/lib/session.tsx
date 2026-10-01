"use client";

import { api, type Bootstrap } from "@masari/api";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { createContext, useContext, useEffect } from "react";

const SessionContext = createContext<Bootstrap | null>(null);

export function useBootstrapQuery() {
  return useQuery({ queryKey: ["bootstrap"], queryFn: () => api<Bootstrap>("me/bootstrap"), staleTime: 60_000 });
}

export function SessionProvider({ value, children }: { value: Bootstrap; children: React.ReactNode }) {
  const router = useRouter();

  useEffect(() => {
    const onUnauthenticated = () => router.replace(`/login?next=${encodeURIComponent(window.location.pathname)}`);
    window.addEventListener("masari:unauthenticated", onUnauthenticated);
    return () => window.removeEventListener("masari:unauthenticated", onUnauthenticated);
  }, [router]);

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

export function useSession(): Bootstrap {
  const session = useContext(SessionContext);
  if (!session) throw new Error("useSession must be used inside SessionProvider");
  return session;
}

/** Whether the current member's role grants an ability (owner has '*'). */
export function useCan() {
  const { abilities } = useSession();
  return (ability: string) => abilities.includes("*") || abilities.includes(ability);
}

/** Refresh wallet balance / counters after mutations. */
export function useRefreshSession() {
  const client = useQueryClient();
  return () => client.invalidateQueries({ queryKey: ["bootstrap"] });
}

/** Revoke the token, drop every cached query and return to the login page. */
export function useLogout() {
  const router = useRouter();
  const client = useQueryClient();

  return async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    client.clear();
    router.replace("/login");
    router.refresh();
  };
}
