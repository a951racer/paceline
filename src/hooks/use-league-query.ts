"use client";

import { useCallback } from "react";
import { useQueryClient, QueryClient } from "@tanstack/react-query";
import { useLeagueStore } from "./use-league-store";

/**
 * Hook that provides the active leagueId for use in query keys and API params.
 * Returns helpers for building league-scoped queries.
 */
export function useLeagueQuery() {
  const activeLeagueId = useLeagueStore((state) => state.activeLeagueId);
  const queryClient = useQueryClient();

  /**
   * Invalidate all queries when league context changes.
   */
  const invalidateAllQueries = useCallback(() => {
    queryClient.invalidateQueries();
  }, [queryClient]);

  /**
   * Build a URL with leagueId query parameter appended.
   */
  const buildLeagueUrl = useCallback(
    (baseUrl: string, additionalParams?: Record<string, string>) => {
      const url = new URL(baseUrl, window.location.origin);
      if (activeLeagueId) {
        url.searchParams.set("leagueId", activeLeagueId);
      }
      if (additionalParams) {
        for (const [key, value] of Object.entries(additionalParams)) {
          url.searchParams.set(key, value);
        }
      }
      return url.pathname + url.search;
    },
    [activeLeagueId]
  );

  /**
   * Build a query key that includes the leagueId for proper cache separation.
   */
  const buildLeagueQueryKey = useCallback(
    (baseKey: string[]) => {
      return [...baseKey, { leagueId: activeLeagueId }];
    },
    [activeLeagueId]
  );

  return {
    activeLeagueId,
    invalidateAllQueries,
    buildLeagueUrl,
    buildLeagueQueryKey,
  };
}

/**
 * Standalone function to invalidate all queries when league changes.
 * Can be used outside of React components if a QueryClient instance is available.
 */
export function invalidateOnLeagueChange(queryClient: QueryClient) {
  queryClient.invalidateQueries();
}

/**
 * Helper to append leagueId to a fetch URL for admin API calls.
 */
export function appendLeagueId(
  url: string,
  leagueId: string | null
): string {
  if (!leagueId) return url;
  const separator = url.includes("?") ? "&" : "?";
  return `${url}${separator}leagueId=${encodeURIComponent(leagueId)}`;
}
