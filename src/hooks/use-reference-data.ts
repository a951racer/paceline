"use client";

import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { adminFetch } from "@/lib/admin-fetch";
import { useLeagueQuery } from "./use-league-query";
import type { ReferenceDataItem, ReferenceDataType } from "@/types";

/**
 * Hook to fetch and consume league-scoped reference data.
 *
 * Fetches all items for the given type from the admin API and provides:
 * - `items`: all reference data items (active + inactive)
 * - `activeItems`: only active items, sorted by sortOrder
 * - `isLoading`: whether the query is in progress
 * - `resolveKey`: maps a key to its label, falling back to raw key if not found
 *
 * Requirements: 3.5, 3.6, 4.5, 4.6, 5.5, 5.6, 6.5, 6.6, 9.2, 9.4
 */
export function useReferenceData(type: ReferenceDataType) {
  const { activeLeagueId, buildLeagueQueryKey } = useLeagueQuery();

  const queryKey = buildLeagueQueryKey(["reference-data", type]);

  const { data, isLoading } = useQuery<ReferenceDataItem[]>({
    queryKey,
    queryFn: async () => {
      const res = await adminFetch(
        `/api/admin/reference-data?type=${encodeURIComponent(type)}`
      );
      if (!res.ok) {
        throw new Error(`Failed to fetch reference data for type: ${type}`);
      }
      const json = await res.json();
      return json.data ?? json;
    },
    enabled: !!activeLeagueId,
  });

  const items: ReferenceDataItem[] = data ?? [];

  const activeItems: ReferenceDataItem[] = useMemo(
    () => items.filter((item) => item.isActive),
    [items]
  );

  const resolveKey = useMemo(() => {
    const lookup = new Map<string, string>();
    for (const item of items) {
      lookup.set(item.key, item.label);
    }
    return (key: string): string => lookup.get(key) ?? key;
  }, [items]);

  return { items, activeItems, isLoading, resolveKey };
}
