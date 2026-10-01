"use client";

import { api, type Bootstrap } from "@masari/api";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { createContext, useContext } from "react";

const SessionContext = createContext<Bootstrap | null>(null);

export function useBootstrapQuery() {
  return useQuery({ queryKey: ["bootstrap"], queryFn: () => api<Bootstrap>("me/bootstrap"), staleTime: 60_000 });
}

export const SessionProvider = SessionContext.Provider;

export function useSession(): Bootstrap {
  const session = useContext(SessionContext);
  if (!session) throw new Error("useSession outside provider");
  return session;
}

/** Super admins get every permission; others per spatie role. */
export function usePermission() {
  const session = useSession();
  const isSuper = session.user.roles?.includes("super_admin");
  return (permission?: string) => !permission || isSuper || session.admin_permissions.includes(permission);
}

/** Revoke the token, drop cached queries and return to the login page. */
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
