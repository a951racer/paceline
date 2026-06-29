"use client";

import React, { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { Trophy, Award, Medal, Loader2, ArrowLeft, Globe } from "lucide-react";

// --- Types ---

interface AchievementDetail {
  _id: string;
  name: string;
  description: string;
  badgeUrl: string;
}

interface AwardDetail {
  _id: string;
  name: string;
  description: string;
  badgeUrl: string;
  nominationType: string;
}

interface EarnedAchievement {
  achievementId: AchievementDetail;
  earnedAt: string;
  racesAtTime: number;
}

interface AssignedAward {
  awardId: AwardDetail;
  assignedAt: string;
  source: string;
}

interface SeasonEntry {
  seasonId: string;
  seasonName: string;
  achievements: EarnedAchievement[];
  awards: AssignedAward[];
}

interface LeagueGroup {
  leagueId: string;
  leagueName: string;
  seasons: SeasonEntry[];
}

interface TrophyCaseData {
  personId: string;
  personName: string;
  leagues?: LeagueGroup[];
  seasons?: SeasonEntry[]; // Legacy format fallback
}

// --- Component ---

/**
 * Person Trophy Case Page
 *
 * Groups achievements and awards by league then season.
 * Displays league name as grouping header.
 * Shows entries from all leagues regardless of active context.
 *
 * Requirements: 8.1, 8.2, 8.3, 8.5
 */
export default function PersonTrophyCasePage() {
  const params = useParams();
  const personId = params.personId as string;

  const [data, setData] = useState<TrophyCaseData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchTrophyCase() {
      setIsLoading(true);
      setError(null);

      try {
        const res = await fetch(`/api/people/${personId}/trophy-case`);
        if (!res.ok) {
          const errData = await res.json().catch(() => null);
          throw new Error(
            errData?.message || `Failed to load trophy case (${res.status})`
          );
        }
        const json = await res.json();
        setData(json.data);
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "Failed to load trophy case";
        setError(message);
      } finally {
        setIsLoading(false);
      }
    }

    if (personId) {
      fetchTrophyCase();
    }
  }, [personId]);

  // Build league groups - handle both new (leagues array) and legacy (seasons array) response format
  const leagueGroups: LeagueGroup[] = data?.leagues
    ? data.leagues
    : data?.seasons
      ? [{ leagueId: "default", leagueName: "League", seasons: data.seasons }]
      : [];

  const hasContent = leagueGroups.some((lg) => lg.seasons.length > 0);

  return (
    <div className="min-h-screen bg-[var(--background)]">
      {/* Page Header */}
      <div className="border-b border-[var(--border)] bg-gradient-to-r from-[var(--color-primary,#1e3a5f)] to-[var(--color-secondary,#2d5a87)]">
        <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
          <Link
            href="/standings"
            className="mb-4 inline-flex items-center gap-1 text-sm text-white/70 hover:text-white transition"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Standings
          </Link>
          <div className="flex items-center gap-3">
            <Trophy className="h-8 w-8 text-yellow-300" />
            <div>
              <h1 className="text-3xl font-bold text-white sm:text-4xl">
                Trophy Case
              </h1>
              {data && (
                <p className="mt-1 text-lg text-white/80">{data.personName}</p>
              )}
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
        ) : !hasContent ? (
          <EmptyState />
        ) : (
          <div className="space-y-12">
            {leagueGroups.map((leagueGroup) => (
              <LeagueSection key={leagueGroup.leagueId} leagueGroup={leagueGroup} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// --- Sub-components ---

function LeagueSection({ leagueGroup }: { leagueGroup: LeagueGroup }) {
  if (leagueGroup.seasons.length === 0) return null;

  return (
    <div>
      {/* League Header */}
      <div className="flex items-center gap-2 mb-6">
        <Globe className="h-5 w-5 text-[var(--color-primary,#1e3a5f)]" />
        <h2 className="text-xl font-bold text-[var(--foreground)]">
          {leagueGroup.leagueName}
        </h2>
      </div>

      <div className="space-y-8">
        {leagueGroup.seasons.map((season) => (
          <SeasonSection key={season.seasonId} season={season} />
        ))}
      </div>
    </div>
  );
}

function SeasonSection({ season }: { season: SeasonEntry }) {
  const totalItems = season.achievements.length + season.awards.length;

  return (
    <div className="overflow-hidden rounded-lg border border-[var(--border)] bg-[var(--background)]">
      {/* Season Header */}
      <div className="border-b border-[var(--border)] bg-[var(--muted)] px-6 py-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-[var(--foreground)]">
            {season.seasonName}
          </h3>
          <span className="rounded-full bg-[var(--color-primary,#1e3a5f)]/10 px-3 py-1 text-xs font-medium text-[var(--color-primary,#1e3a5f)]">
            {totalItems} {totalItems === 1 ? "item" : "items"}
          </span>
        </div>
      </div>

      <div className="divide-y divide-[var(--border)]">
        {/* Achievements */}
        {season.achievements.length > 0 && (
          <div className="p-6">
            <div className="mb-4 flex items-center gap-2">
              <Medal className="h-5 w-5 text-[var(--color-primary,#1e3a5f)]" />
              <h4 className="text-sm font-semibold text-[var(--foreground)]">
                Achievements
              </h4>
            </div>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {season.achievements.map((achievement, idx) => (
                <AchievementCard key={idx} achievement={achievement} />
              ))}
            </div>
          </div>
        )}

        {/* Awards */}
        {season.awards.length > 0 && (
          <div className="p-6">
            <div className="mb-4 flex items-center gap-2">
              <Award className="h-5 w-5 text-[var(--color-primary,#1e3a5f)]" />
              <h4 className="text-sm font-semibold text-[var(--foreground)]">
                Awards
              </h4>
            </div>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {season.awards.map((award, idx) => (
                <AwardCard key={idx} award={award} />
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function AchievementCard({ achievement }: { achievement: EarnedAchievement }) {
  const detail = achievement.achievementId;
  const earnedDate = new Date(achievement.earnedAt).toLocaleDateString(
    undefined,
    { year: "numeric", month: "short", day: "numeric" }
  );

  return (
    <div className="flex gap-3 rounded-lg border border-[var(--border)] bg-[var(--background)] p-4 transition hover:shadow-sm">
      <div className="flex-shrink-0">
        {detail?.badgeUrl ? (
          <Image
            src={detail.badgeUrl}
            alt={detail?.name || "Achievement badge"}
            width={48}
            height={48}
            className="h-12 w-12 rounded-lg object-cover"
          />
        ) : (
          <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-yellow-100">
            <Medal className="h-6 w-6 text-yellow-600" />
          </div>
        )}
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium text-[var(--foreground)]">
          {detail?.name || "Achievement"}
        </p>
        {detail?.description && (
          <p className="mt-0.5 text-xs text-[var(--muted-foreground)] line-clamp-2">
            {detail.description}
          </p>
        )}
        <p className="mt-1 text-xs text-[var(--muted-foreground)]">
          Earned {earnedDate}
        </p>
      </div>
    </div>
  );
}

function AwardCard({ award }: { award: AssignedAward }) {
  const detail = award.awardId;
  const assignedDate = new Date(award.assignedAt).toLocaleDateString(
    undefined,
    { year: "numeric", month: "short", day: "numeric" }
  );

  return (
    <div className="flex gap-3 rounded-lg border border-[var(--border)] bg-[var(--background)] p-4 transition hover:shadow-sm">
      <div className="flex-shrink-0">
        {detail?.badgeUrl ? (
          <Image
            src={detail.badgeUrl}
            alt={detail?.name || "Award badge"}
            width={48}
            height={48}
            className="h-12 w-12 rounded-lg object-cover"
          />
        ) : (
          <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-blue-100">
            <Award className="h-6 w-6 text-blue-600" />
          </div>
        )}
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium text-[var(--foreground)]">
          {detail?.name || "Award"}
        </p>
        {detail?.description && (
          <p className="mt-0.5 text-xs text-[var(--muted-foreground)] line-clamp-2">
            {detail.description}
          </p>
        )}
        <div className="mt-1 flex items-center gap-2">
          <p className="text-xs text-[var(--muted-foreground)]">
            {assignedDate}
          </p>
          {award.source === "peer_nominated" && (
            <span className="rounded-full bg-purple-100 px-2 py-0.5 text-[10px] font-medium text-purple-700">
              Peer Nominated
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

function LoadingState() {
  return (
    <div className="flex flex-col items-center justify-center py-20">
      <Loader2 className="h-8 w-8 animate-spin text-[var(--color-primary,#1e3a5f)]" />
      <p className="mt-4 text-sm text-[var(--muted-foreground)]">
        Loading trophy case...
      </p>
    </div>
  );
}

function ErrorState({ message }: { message: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-20">
      <div className="rounded-lg border border-red-200 bg-red-50 p-6 text-center">
        <p className="text-sm font-medium text-red-800">
          Unable to load trophy case
        </p>
        <p className="mt-1 text-sm text-red-600">{message}</p>
      </div>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="rounded-lg border border-dashed border-[var(--border)] p-12 text-center">
      <Trophy className="mx-auto h-12 w-12 text-[var(--muted-foreground)]/40" />
      <h3 className="mt-4 text-sm font-medium text-[var(--foreground)]">
        No achievements or awards yet
      </h3>
      <p className="mt-2 text-sm text-[var(--muted-foreground)]">
        Achievements and awards will appear here as they are earned.
      </p>
    </div>
  );
}
