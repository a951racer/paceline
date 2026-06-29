"use client";

import { useEffect } from "react";
import { useLeagueStore } from "./use-league-store";

interface UserLeagueResponse {
  data: Array<{ _id: string; name: string }>;
}

/**
 * Hook to fetch and set available leagues when the user authenticates.
 * Call this in the authenticated layout or on login success.
 *
 * On login success: calls GET /api/user/leagues and populates
 * useLeagueStore.availableLeagues. Sets the initial active league
 * from the response (first league or previously persisted selection).
 *
 * Requirements: 6.2, 6.6
 */
export function useLeagueInit() {
  const { setAvailableLeagues, activeLeagueId, setActiveLeague } =
    useLeagueStore();

  useEffect(() => {
    async function fetchUserLeagues() {
      try {
        const token = localStorage.getItem("accessToken");
        if (!token) return;

        const res = await fetch("/api/user/leagues", {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        if (!res.ok) return;

        const json: UserLeagueResponse = await res.json();
        const leagues = (json.data || []).map((l) => ({
          id: l._id,
          name: l.name,
        }));

        setAvailableLeagues(leagues);

        // If no active league persisted (or persisted one is no longer available),
        // setAvailableLeagues already handles setting the first one.
        // If there IS a persisted active league that's in the list, keep it.
        if (
          leagues.length > 0 &&
          activeLeagueId &&
          leagues.some((l) => l.id === activeLeagueId)
        ) {
          // Already set from localStorage persistence, no action needed
        } else if (leagues.length > 0 && !activeLeagueId) {
          setActiveLeague(leagues[0].id);
        }
      } catch (err) {
        console.error("[useLeagueInit] Failed to fetch user leagues:", err);
      }
    }

    fetchUserLeagues();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
}

/**
 * Standalone function to fetch and set leagues on login.
 * Can be called from login handlers directly.
 */
export async function initLeaguesOnLogin(token: string) {
  try {
    const res = await fetch("/api/user/leagues", {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (!res.ok) return;

    const json: UserLeagueResponse = await res.json();
    const leagues = (json.data || []).map((l) => ({
      id: l._id,
      name: l.name,
    }));

    const store = useLeagueStore.getState();
    store.setAvailableLeagues(leagues);

    // Set initial active league if none persisted
    if (leagues.length > 0 && !store.activeLeagueId) {
      store.setActiveLeague(leagues[0].id);
    }
  } catch (err) {
    console.error("[initLeaguesOnLogin] Failed to fetch user leagues:", err);
  }
}

/**
 * Call on logout to clear league context.
 */
export function clearLeaguesOnLogout() {
  useLeagueStore.getState().clearLeagueContext();
}
