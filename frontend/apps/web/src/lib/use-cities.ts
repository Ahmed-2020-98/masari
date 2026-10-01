"use client";

import { api, type Region } from "@masari/api";
import { useQuery } from "@tanstack/react-query";

export function useRegions() {
  return useQuery({ queryKey: ["regions"], queryFn: () => api<{ data: Region[] }>("public/cities"), staleTime: Infinity, select: (result) => result.data });
}
