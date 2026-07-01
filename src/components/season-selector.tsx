"use client";

import React, { useState, useRef, useEffect, useCallback } from "react";
import { Calendar, ChevronDown, Check } from "lucide-react";
import { useSeasonStore } from "@/hooks/use-season-store";
import { useLeagueStore } from "@/hooks/use-league-store";
import { adminFetch } from "@/lib/admin-fetch";

/**
 * SeasonSelector - Dropdown in the authenticated TopBar for switching
 * between active seasons within the current league.
 * Fetches seasons for the active league and shows only active ones.
 * Updates the Zustand store on selection.
 */
export function SeasonSelector() {
  const {
    activeSeasonId,
    activeSeasonName,
    availableSeasons,
    setActiveSeason,
    setAvailableSeasons,
  } = useSeasonStore();

  const activeLeagueId = useLeagueStore((state) => state.activeLeagueId);

  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Fetch seasons when league changes
  const fetchSeasons = useCallback(async () => {
    if (!activeLeagueId) {
      setAvailableSeasons([]);
      return;
    }
    try {
      const res = await adminFetch("/api/admin/seasons");
      if (res.ok) {
        const json = await res.json();
        const data = (json.data || []) as { _id: string; name: string; isActive: boolean }[];
        const activeSeasons = data
          .filter((s) => s.isActive)
          .map((s) => ({ id: s._id, name: s.name }));
        setAvailableSeasons(activeSeasons);
      }
    } catch {
      // Non-critical
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeLeagueId]);

  useEffect(() => {
    fetchSeasons();
  }, [fetchSeasons]);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Close on escape key
  useEffect(() => {
    function handleEscape(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener("keydown", handleEscape);
      return () => document.removeEventListener("keydown", handleEscape);
    }
  }, [isOpen]);

  function handleSelect(seasonId: string) {
    if (seasonId !== activeSeasonId) {
      setActiveSeason(seasonId);
    }
    setIsOpen(false);
  }

  const displayName = activeSeasonName ?? "Select Season";

  if (availableSeasons.length === 0) {
    return null;
  }

  return (
    <div ref={dropdownRef} className="relative">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 rounded-md px-3 py-1.5 text-sm font-medium text-white hover:bg-[#1E1F24] transition-colors"
        aria-expanded={isOpen}
        aria-haspopup="listbox"
        aria-label="Select season"
      >
        <Calendar className="h-4 w-4 text-[#9CA3AF]" />
        <span className="uppercase tracking-wide max-w-[200px] truncate">
          {displayName}
        </span>
        <ChevronDown
          className={`h-3.5 w-3.5 text-[#6B7280] transition-transform ${isOpen ? "rotate-180" : ""}`}
        />
      </button>

      {isOpen && availableSeasons.length > 0 && (
        <div
          role="listbox"
          aria-label="Available seasons"
          className="absolute left-0 top-full z-50 mt-1 w-56 rounded-lg border border-[#2E3038] bg-[#1A1B1F] shadow-xl"
        >
          <div className="p-1">
            {availableSeasons.map((season) => (
              <button
                key={season.id}
                role="option"
                aria-selected={season.id === activeSeasonId}
                onClick={() => handleSelect(season.id)}
                className={`flex w-full items-center justify-between rounded-md px-3 py-2 text-sm transition-colors ${
                  season.id === activeSeasonId
                    ? "bg-[#2E3038] text-white"
                    : "text-[#C5CBD3] hover:bg-[#2E3038] hover:text-white"
                }`}
              >
                <span className="truncate">{season.name}</span>
                {season.id === activeSeasonId && (
                  <Check className="h-4 w-4 flex-shrink-0 text-[var(--color-primary,#B87333)]" />
                )}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
