"use client";

import React, { useState, useEffect } from "react";
import { ChevronDown, Globe } from "lucide-react";

interface PublicLeague {
  _id: string;
  name: string;
}

interface PublicLeagueSelectorProps {
  /** Currently selected league ID */
  selectedLeagueId: string;
  /** Callback when a league is selected */
  onLeagueChange: (leagueId: string) => void;
}

/**
 * PublicLeagueSelector - Dropdown on the public Standings page
 * for visitors to choose which league's standings to view.
 *
 * Fetches active leagues from GET /api/leagues (no auth required).
 *
 * Requirements: 7.2
 */
export function PublicLeagueSelector({
  selectedLeagueId,
  onLeagueChange,
}: PublicLeagueSelectorProps) {
  const [leagues, setLeagues] = useState<PublicLeague[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function fetchLeagues() {
      try {
        const res = await fetch("/api/leagues");
        if (res.ok) {
          const json = await res.json();
          const data: PublicLeague[] = json.data || [];
          setLeagues(data);

          // If no league is currently selected, select the first one
          if (!selectedLeagueId && data.length > 0) {
            onLeagueChange(data[0]._id);
          }
        }
      } catch (err) {
        console.error("Failed to fetch leagues:", err);
      } finally {
        setIsLoading(false);
      }
    }
    fetchLeagues();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (isLoading || leagues.length === 0) {
    return null;
  }

  // Don't show selector if only one league
  if (leagues.length === 1) {
    return null;
  }

  return (
    <div className="relative">
      <label htmlFor="public-league-select" className="sr-only">
        Select league
      </label>
      <div className="relative inline-flex items-center">
        <Globe className="pointer-events-none absolute left-3 h-4 w-4 text-white/70" />
        <select
          id="public-league-select"
          value={selectedLeagueId}
          onChange={(e) => onLeagueChange(e.target.value)}
          className="appearance-none rounded-lg border border-white/20 bg-white/10 py-2.5 pl-9 pr-10 text-sm font-medium text-white backdrop-blur-sm transition focus:border-white/40 focus:outline-none focus:ring-2 focus:ring-white/20"
        >
          {leagues.map((league) => (
            <option
              key={league._id}
              value={league._id}
              className="text-gray-900"
            >
              {league.name}
            </option>
          ))}
        </select>
        <ChevronDown className="pointer-events-none absolute right-3 h-4 w-4 text-white/70" />
      </div>
    </div>
  );
}
