"use client";

import React, { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import {
  Trophy,
  Users,
  ChevronDown,
  Loader2,
  Award,
  Star,
  TrendingUp,
} from "lucide-react";
import { PublicLeagueSelector } from "@/components/public-league-selector";

// --- Types ---

interface StandingEntry {
  _id: string;
  competitionId: string;
  seasonId: string;
  racerId: string;
  category: string;
  teamId?: string;
  totalPoints: number;
  totalRaces: number;
  position: number;
  racerName?: string;
  teamName?: string;
  lastUpdated: string;
}

interface TeamStandingEntry {
  _id: string;
  competitionId: string;
  seasonId: string;
  organizationId: string;
  totalPoints: number;
  totalRaces: number;
  position: number;
  organizationName?: string;
  lastUpdated: string;
}

interface Season {
  _id: string;
  name: string;
  startDate: string;
  endDate: string;
  isActive: boolean;
}

interface StandingsResponse {
  data: Record<string, StandingEntry[]>;
  seasonId?: string;
  seasonName?: string;
  message?: string;
}

interface TeamStandingsResponse {
  data: Record<string, TeamStandingEntry[]>;
  seasonId?: string;
  seasonName?: string;
  message?: string;
}

interface SeasonsResponse {
  data: Season[];
}

// --- Component ---

/**
 * Public Standings Page
 *
 * - Adds PublicLeagueSelector for visitors to choose league
 * - Displays standings for active season of selected league
 * - Allows switching between historical seasons within selected league
 * - Shows only enrolled persons/teams in standings
 *
 * Requirements: 7.1, 7.2, 7.3, 7.4, 7.5, 7.6
 */
export default function StandingsPage() {
  const [selectedLeagueId, setSelectedLeagueId] = useState<string>("");
  const [seasons, setSeasons] = useState<Season[]>([]);
  const [selectedSeasonId, setSelectedSeasonId] = useState<string>("");
  const [standings, setStandings] = useState<Record<string, StandingEntry[]>>(
    {}
  );
  const [teamStandings, setTeamStandings] = useState<
    Record<string, TeamStandingEntry[]>
  >({});
  const [seasonName, setSeasonName] = useState<string>("");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [categoryLookup, setCategoryLookup] = useState<Record<string, string>>({});

  // Fetch category reference data for the selected league (public-safe: falls back to raw key)
  useEffect(() => {
    async function fetchCategories() {
      if (!selectedLeagueId) return;
      try {
        const res = await fetch(
          `/api/admin/reference-data?type=category&leagueId=${encodeURIComponent(selectedLeagueId)}`
        );
        if (res.ok) {
          const json = await res.json();
          const items: { key: string; label: string }[] = json.data ?? json;
          const lookup: Record<string, string> = {};
          for (const item of items) {
            lookup[item.key] = item.label;
          }
          setCategoryLookup(lookup);
        }
      } catch {
        // Non-critical: fall back to raw key display
      }
    }
    fetchCategories();
  }, [selectedLeagueId]);

  const resolveCategory = useCallback(
    (key: string): string => categoryLookup[key] || key,
    [categoryLookup]
  );

  // Fetch seasons for the selected league
  useEffect(() => {
    async function fetchSeasons() {
      if (!selectedLeagueId) return;
      try {
        const res = await fetch(`/api/seasons?leagueId=${selectedLeagueId}`);
        if (res.ok) {
          const json: SeasonsResponse = await res.json();
          setSeasons(json.data || []);
        }
      } catch (err) {
        console.error("Failed to fetch seasons:", err);
      }
    }
    fetchSeasons();
  }, [selectedLeagueId]);

  // Fetch standings based on selected league and season
  const fetchStandings = useCallback(
    async (seasonId?: string) => {
      if (!selectedLeagueId) return;
      setIsLoading(true);
      setError(null);

      try {
        const leagueParam = `leagueId=${selectedLeagueId}`;
        const standingsUrl = seasonId
          ? `/api/standings/${seasonId}?${leagueParam}`
          : `/api/standings?${leagueParam}`;
        const teamUrl = `/api/standings/team?${leagueParam}`;

        const [standingsRes, teamRes] = await Promise.all([
          fetch(standingsUrl),
          fetch(teamUrl),
        ]);

        if (!standingsRes.ok) {
          throw new Error("Failed to fetch standings");
        }

        const standingsJson: StandingsResponse = await standingsRes.json();
        setStandings(standingsJson.data || {});
        setSeasonName(standingsJson.seasonName || "");

        if (teamRes.ok) {
          const teamJson: TeamStandingsResponse = await teamRes.json();
          setTeamStandings(teamJson.data || {});
        }
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "Failed to load standings";
        setError(message);
      } finally {
        setIsLoading(false);
      }
    },
    [selectedLeagueId]
  );

  // Re-fetch standings when league changes (load active season standings)
  useEffect(() => {
    if (selectedLeagueId) {
      setSelectedSeasonId("");
      fetchStandings();
    }
  }, [selectedLeagueId, fetchStandings]);

  // Handle league change from PublicLeagueSelector
  function handleLeagueChange(leagueId: string) {
    setSelectedLeagueId(leagueId);
  }

  // Handle season change
  function handleSeasonChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const value = e.target.value;
    setSelectedSeasonId(value);
    fetchStandings(value || undefined);
  }

  // Group standings by category
  function groupByCategory(
    data: Record<string, StandingEntry[]>
  ): Record<string, StandingEntry[]> {
    const grouped: Record<string, StandingEntry[]> = {};
    for (const entries of Object.values(data)) {
      for (const entry of entries) {
        const cat = entry.category || "uncategorized";
        if (!grouped[cat]) {
          grouped[cat] = [];
        }
        grouped[cat].push(entry);
      }
    }
    // Sort each category by position
    for (const cat of Object.keys(grouped)) {
      grouped[cat].sort((a, b) => a.position - b.position);
    }
    return grouped;
  }

  const categorizedStandings = groupByCategory(standings);
  const hasStandings = Object.keys(categorizedStandings).length > 0;
  const hasTeamStandings = Object.keys(teamStandings).length > 0;

  return (
    <div className="min-h-screen bg-[var(--background)]">
      {/* Page Header */}
      <div className="border-b border-[var(--border)] bg-gradient-to-r from-[var(--color-primary,#1e3a5f)] to-[var(--color-secondary,#2d5a87)]">
        <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h1 className="text-3xl font-bold text-white sm:text-4xl">
                League Standings
              </h1>
              <p className="mt-2 text-white/70">
                {seasonName
                  ? `${seasonName} Season`
                  : "Current season standings"}
              </p>
            </div>

            {/* Selectors */}
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              {/* League Selector */}
              <PublicLeagueSelector
                selectedLeagueId={selectedLeagueId}
                onLeagueChange={handleLeagueChange}
              />

              {/* Season Selector */}
              <div className="relative">
                <label htmlFor="season-select" className="sr-only">
                  Select season
                </label>
                <div className="relative">
                  <select
                    id="season-select"
                    value={selectedSeasonId}
                    onChange={handleSeasonChange}
                    className="appearance-none rounded-lg border border-white/20 bg-white/10 px-4 py-2.5 pr-10 text-sm font-medium text-white backdrop-blur-sm transition focus:border-white/40 focus:outline-none focus:ring-2 focus:ring-white/20"
                  >
                    <option value="" className="text-gray-900">
                      Active Season
                    </option>
                    {seasons.map((season) => (
                      <option
                        key={season._id}
                        value={season._id}
                        className="text-gray-900"
                      >
                        {season.name}
                        {season.isActive ? " (Active)" : ""}
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/70" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        {isLoading ? (
          <LoadingState />
        ) : error ? (
          <ErrorState message={error} />
        ) : (
          <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
            {/* Individual Standings - takes 2 columns */}
            <div className="lg:col-span-2">
              <div className="flex items-center gap-2 mb-6">
                <Trophy className="h-5 w-5 text-[var(--color-primary,#1e3a5f)]" />
                <h2 className="text-xl font-bold text-[var(--foreground)]">
                  Individual Standings
                </h2>
              </div>

              {hasStandings ? (
                <div className="space-y-8">
                  {Object.entries(categorizedStandings).map(
                    ([category, entries]) => (
                      <CategoryStandingsTable
                        key={category}
                        category={category}
                        entries={entries}
                        resolveCategory={resolveCategory}
                      />
                    )
                  )}
                </div>
              ) : (
                <EmptyState message="No individual standings available for this season." />
              )}
            </div>

            {/* Sidebar - Team Standings + Info Sections */}
            <div className="space-y-8">
              {/* Team Standings */}
              <div>
                <div className="flex items-center gap-2 mb-4">
                  <Users className="h-5 w-5 text-[var(--color-primary,#1e3a5f)]" />
                  <h2 className="text-xl font-bold text-[var(--foreground)]">
                    Team Standings
                  </h2>
                </div>

                {hasTeamStandings ? (
                  <TeamStandingsCard teamStandings={teamStandings} />
                ) : (
                  <EmptyState message="No team standings available." />
                )}
              </div>

              {/* Recent Results */}
              <InfoCard
                icon={<TrendingUp className="h-5 w-5" />}
                title="Recent Results"
                description="Recent race results will be displayed here as races are completed throughout the season."
              />

              {/* Achievements */}
              <InfoCard
                icon={<Award className="h-5 w-5" />}
                title="Achievements & Awards"
                description="Earned achievements, awards, and peer nominations will appear here."
              />

              {/* Calculated Recognitions */}
              <InfoCard
                icon={<Star className="h-5 w-5" />}
                title="Recognitions"
                description="Calculated recognitions like Most Improved Rider and Biggest Mover will be shown here."
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// --- Sub-components ---

function CategoryStandingsTable({
  category,
  entries,
  resolveCategory,
}: {
  category: string;
  entries: StandingEntry[];
  resolveCategory: (key: string) => string;
}) {
  return (
    <div className="overflow-hidden rounded-lg border border-[var(--border)] bg-[var(--background)]">
      <div className="border-b border-[var(--border)] bg-[var(--muted)] px-4 py-3">
        <h3 className="text-sm font-semibold text-[var(--foreground)]">
          {resolveCategory(category)}
        </h3>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-[var(--border)] bg-[var(--muted)]/50">
              <th className="px-4 py-3 font-medium text-[var(--muted-foreground)] w-12">
                #
              </th>
              <th className="px-4 py-3 font-medium text-[var(--muted-foreground)]">
                Racer
              </th>
              <th className="px-4 py-3 font-medium text-[var(--muted-foreground)]">
                Team
              </th>
              <th className="px-4 py-3 font-medium text-[var(--muted-foreground)] text-right">
                Points
              </th>
              <th className="px-4 py-3 font-medium text-[var(--muted-foreground)] text-right">
                Races
              </th>
            </tr>
          </thead>
          <tbody>
            {entries.map((entry, idx) => (
              <tr
                key={entry._id}
                className={`border-b border-[var(--border)] last:border-0 transition-colors hover:bg-[var(--muted)]/30 ${
                  idx < 3 ? "bg-[var(--color-primary,#1e3a5f)]/5" : ""
                }`}
              >
                <td className="px-4 py-3">
                  <PositionBadge position={entry.position} />
                </td>
                <td className="px-4 py-3">
                  <Link
                    href={`/trophy-case/${entry.racerId}`}
                    className="font-medium text-[var(--foreground)] hover:text-[var(--color-primary,#1e3a5f)] hover:underline"
                  >
                    {entry.racerName || `Racer ${entry.racerId.slice(-6)}`}
                  </Link>
                </td>
                <td className="px-4 py-3 text-[var(--muted-foreground)]">
                  {entry.teamId ? (
                    <Link
                      href={`/trophy-case/team/${entry.teamId}`}
                      className="hover:text-[var(--color-primary,#1e3a5f)] hover:underline"
                    >
                      {entry.teamName || `Team ${entry.teamId.slice(-6)}`}
                    </Link>
                  ) : (
                    <span className="text-[var(--muted-foreground)]/60">—</span>
                  )}
                </td>
                <td className="px-4 py-3 text-right font-semibold text-[var(--foreground)]">
                  {entry.totalPoints}
                </td>
                <td className="px-4 py-3 text-right text-[var(--muted-foreground)]">
                  {entry.totalRaces}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function TeamStandingsCard({
  teamStandings,
}: {
  teamStandings: Record<string, TeamStandingEntry[]>;
}) {
  const allTeams: TeamStandingEntry[] = Object.values(teamStandings)
    .flat()
    .sort((a, b) => a.position - b.position);

  return (
    <div className="overflow-hidden rounded-lg border border-[var(--border)] bg-[var(--background)]">
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-[var(--border)] bg-[var(--muted)]/50">
              <th className="px-4 py-3 font-medium text-[var(--muted-foreground)] w-10">
                #
              </th>
              <th className="px-4 py-3 font-medium text-[var(--muted-foreground)]">
                Team
              </th>
              <th className="px-4 py-3 font-medium text-[var(--muted-foreground)] text-right">
                Pts
              </th>
            </tr>
          </thead>
          <tbody>
            {allTeams.map((team, idx) => (
              <tr
                key={team._id}
                className={`border-b border-[var(--border)] last:border-0 transition-colors hover:bg-[var(--muted)]/30 ${
                  idx < 3 ? "bg-[var(--color-primary,#1e3a5f)]/5" : ""
                }`}
              >
                <td className="px-4 py-3">
                  <PositionBadge position={team.position} />
                </td>
                <td className="px-4 py-3">
                  <Link
                    href={`/trophy-case/team/${team.organizationId}`}
                    className="font-medium text-[var(--foreground)] hover:text-[var(--color-primary,#1e3a5f)] hover:underline"
                  >
                    {team.organizationName ||
                      `Team ${team.organizationId.slice(-6)}`}
                  </Link>
                </td>
                <td className="px-4 py-3 text-right font-semibold text-[var(--foreground)]">
                  {team.totalPoints}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function PositionBadge({ position }: { position: number }) {
  if (position === 1) {
    return (
      <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-yellow-100 text-xs font-bold text-yellow-700">
        1
      </span>
    );
  }
  if (position === 2) {
    return (
      <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-gray-100 text-xs font-bold text-gray-600">
        2
      </span>
    );
  }
  if (position === 3) {
    return (
      <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-orange-100 text-xs font-bold text-orange-700">
        3
      </span>
    );
  }
  return (
    <span className="text-sm text-[var(--muted-foreground)]">{position}</span>
  );
}

function InfoCard({
  icon,
  title,
  description,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
}) {
  return (
    <div className="rounded-lg border border-[var(--border)] bg-[var(--background)] p-5">
      <div className="flex items-center gap-2 text-[var(--color-primary,#1e3a5f)]">
        {icon}
        <h3 className="text-sm font-semibold text-[var(--foreground)]">
          {title}
        </h3>
      </div>
      <p className="mt-2 text-sm text-[var(--muted-foreground)]">
        {description}
      </p>
      <span className="mt-3 inline-block rounded-full bg-[var(--muted)] px-3 py-1 text-xs font-medium text-[var(--muted-foreground)]">
        Coming Soon
      </span>
    </div>
  );
}

function LoadingState() {
  return (
    <div className="flex flex-col items-center justify-center py-20">
      <Loader2 className="h-8 w-8 animate-spin text-[var(--color-primary,#1e3a5f)]" />
      <p className="mt-4 text-sm text-[var(--muted-foreground)]">
        Loading standings...
      </p>
    </div>
  );
}

function ErrorState({ message }: { message: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-20">
      <div className="rounded-lg border border-red-200 bg-red-50 p-6 text-center">
        <p className="text-sm font-medium text-red-800">
          Unable to load standings
        </p>
        <p className="mt-1 text-sm text-red-600">{message}</p>
      </div>
    </div>
  );
}

function EmptyState({ message }: { message: string }) {
  return (
    <div className="rounded-lg border border-dashed border-[var(--border)] p-8 text-center">
      <Trophy className="mx-auto h-10 w-10 text-[var(--muted-foreground)]/40" />
      <p className="mt-3 text-sm text-[var(--muted-foreground)]">{message}</p>
    </div>
  );
}
