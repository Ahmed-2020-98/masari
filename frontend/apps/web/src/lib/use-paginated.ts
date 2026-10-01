"use client";

import { api, type Paginated } from "@masari/api";
import { keepPreviousData, useQuery } from "@tanstack/react-query";

/** Paginated Laravel resource list with filters kept in the query key. */
export function usePaginated<T, Extra = object>(path: string, query: Record<string, string | number | boolean | undefined | null>) {
  return useQuery({
    queryKey: [path, query],
    queryFn: () => api<Paginated<T> & Extra>(path, { query }),
    placeholderData: keepPreviousData,
  });
}
