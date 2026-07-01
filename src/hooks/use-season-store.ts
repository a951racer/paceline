"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";

export interface SeasonOption {
  id: string;
  name: string;
}

export interface SeasonState {
  activeSeasonId: string | null;
  activeSeasonName: string | null;
  availableSeasons: SeasonOption[];
  setActiveSeason: (seasonId: string) => void;
  setAvailableSeasons: (seasons: SeasonOption[]) => void;
  clearSeasonContext: () => void;
}

export const useSeasonStore = create<SeasonState>()(
  persist(
    (set, get) => ({
      activeSeasonId: null,
      activeSeasonName: null,
      availableSeasons: [],

      setActiveSeason: (seasonId: string) => {
        const { availableSeasons } = get();
        const season = availableSeasons.find((s) => s.id === seasonId);
        set({
          activeSeasonId: seasonId,
          activeSeasonName: season?.name ?? null,
        });
      },

      setAvailableSeasons: (seasons: SeasonOption[]) => {
        const { activeSeasonId } = get();
        const newState: Partial<SeasonState> = { availableSeasons: seasons };

        // If current active season is not in the new list, set to first available
        if (seasons.length > 0) {
          const stillAvailable = seasons.some((s) => s.id === activeSeasonId);
          if (!stillAvailable) {
            newState.activeSeasonId = seasons[0].id;
            newState.activeSeasonName = seasons[0].name;
          }
        } else {
          newState.activeSeasonId = null;
          newState.activeSeasonName = null;
        }

        set(newState);
      },

      clearSeasonContext: () => {
        set({
          activeSeasonId: null,
          activeSeasonName: null,
          availableSeasons: [],
        });
      },
    }),
    {
      name: "season-context",
      partialize: (state) => ({
        activeSeasonId: state.activeSeasonId,
        activeSeasonName: state.activeSeasonName,
      }),
    }
  )
);
