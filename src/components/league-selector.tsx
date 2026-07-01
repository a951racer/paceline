"use client";

import React, { useState, useRef, useEffect } from "react";
import { Globe, ChevronDown, Check } from "lucide-react";
import { useLeagueStore } from "@/hooks/use-league-store";
import { useQueryClient } from "@tanstack/react-query";

/**
 * LeagueSelector - Dropdown in the authenticated TopBar for switching
 * between leagues. Shows available leagues based on user role:
 * - Super_Admin: all leagues
 * - League_Admin: only assigned leagues
 * - Regular users: leagues with enrollments
 *
 * On select: updates the Zustand store and invalidates all TanStack Query caches.
 *
 * Requirements: 6.1, 6.2, 6.3, 6.4
 */
export function LeagueSelector() {
  const {
    activeLeagueId,
    activeLeagueName,
    availableLeagues,
    setActiveLeague,
  } = useLeagueStore();

  const queryClient = useQueryClient();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

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

  function handleSelect(leagueId: string) {
    if (leagueId !== activeLeagueId) {
      setActiveLeague(leagueId);
      // Invalidate all TanStack Query caches to refresh data for new league context
      queryClient.invalidateQueries();
    }
    setIsOpen(false);
  }

  const displayName = activeLeagueName ?? "Select League";

  return (
    <div ref={dropdownRef} className="relative">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 rounded-md px-3 py-1.5 text-sm font-medium text-white hover:bg-[#1E1F24] transition-colors"
        aria-expanded={isOpen}
        aria-haspopup="listbox"
        aria-label="Select league"
      >
        <Globe className="h-4 w-4 text-[#9CA3AF]" />
        <span className="uppercase tracking-wide max-w-[600px] truncate">
          {displayName}
        </span>
        <ChevronDown
          className={`h-3.5 w-3.5 text-[#6B7280] transition-transform ${isOpen ? "rotate-180" : ""}`}
        />
      </button>

      {isOpen && availableLeagues.length > 0 && (
        <div
          role="listbox"
          aria-label="Available leagues"
          className="absolute left-0 top-full z-50 mt-1 w-96 rounded-lg border border-[#2E3038] bg-[#1A1B1F] shadow-xl"
        >
          <div className="p-1">
            {availableLeagues.map((league) => (
              <button
                key={league.id}
                role="option"
                aria-selected={league.id === activeLeagueId}
                onClick={() => handleSelect(league.id)}
                className={`flex w-full items-center justify-between rounded-md px-3 py-2 text-sm transition-colors ${
                  league.id === activeLeagueId
                    ? "bg-[#2E3038] text-white"
                    : "text-[#C5CBD3] hover:bg-[#2E3038] hover:text-white"
                }`}
              >
                <span className="truncate">{league.name}</span>
                {league.id === activeLeagueId && (
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
