"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";

export interface LeagueOption {
  id: string;
  name: string;
}

export interface LeagueState {
  activeLeagueId: string | null;
  activeLeagueName: string | null;
  availableLeagues: LeagueOption[];
  setActiveLeague: (leagueId: string) => void;
  setAvailableLeagues: (leagues: LeagueOption[]) => void;
  clearLeagueContext: () => void;
}

export const useLeagueStore = create<LeagueState>()(
  persist(
    (set, get) => ({
      activeLeagueId: null,
      activeLeagueName: null,
      availableLeagues: [],

      setActiveLeague: (leagueId: string) => {
        const { availableLeagues } = get();
        const league = availableLeagues.find((l) => l.id === leagueId);
        set({
          activeLeagueId: leagueId,
          activeLeagueName: league?.name ?? null,
        });
      },

      setAvailableLeagues: (leagues: LeagueOption[]) => {
        const { activeLeagueId } = get();
        const newState: Partial<LeagueState> = { availableLeagues: leagues };

        // If current active league is not in the new list, set to first available
        if (leagues.length > 0) {
          const stillAvailable = leagues.some((l) => l.id === activeLeagueId);
          if (!stillAvailable) {
            newState.activeLeagueId = leagues[0].id;
            newState.activeLeagueName = leagues[0].name;
          }
        } else {
          newState.activeLeagueId = null;
          newState.activeLeagueName = null;
        }

        set(newState);
      },

      clearLeagueContext: () => {
        set({
          activeLeagueId: null,
          activeLeagueName: null,
          availableLeagues: [],
        });
      },
    }),
    {
      name: "league-context",
      partialize: (state) => ({
        activeLeagueId: state.activeLeagueId,
        activeLeagueName: state.activeLeagueName,
      }),
    }
  )
);
