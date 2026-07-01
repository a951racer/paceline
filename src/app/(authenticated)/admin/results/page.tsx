"use client";

import React, { useEffect, useState, useCallback, useMemo } from "react";
import { ListOrdered, ChevronRight } from "lucide-react";
import Link from "next/link";
import { adminFetch } from "@/lib/admin-fetch";
import { useReferenceData } from "@/hooks/use-reference-data";
import { useLeagueStore } from "@/hooks/use-league-store";
import { useUserStore } from "@/hooks/use-user-store";

interface Race {
  _id: string;
  name: string;
  date: string;
  status: string;
  raceType: string;
  leagueId?: string;
  location: { name: string };
}

export default function AdminResultsPage() {
  const [races, setRaces] = useState<Race[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [leagueFilterMode, setLeagueFilterMode] = useState<"all" | "current" | "unassociated">("current");

  const activeLeagueId = useLeagueStore((state) => state.activeLeagueId);
  const isSuperAdmin = useUserStore((state) => state.isSuperAdmin);
  const { resolveKey: resolveRaceType } = useReferenceData("race_type");

  const fetchRaces = useCallback(async () => {
    try {
      setLoading(true);
      const res = isSuperAdmin && leagueFilterMode === "all"
        ? await fetch("/api/admin/races", { headers: { Authorization: `Bearer ${localStorage.getItem("accessToken")}` } })
        : await adminFetch("/api/admin/races");
      if (!res.ok) throw new Error("Failed to fetch races");
      const json = await res.json();
      setRaces(json.data || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setLoading(false);
    }
  }, [activeLeagueId, leagueFilterMode, isSuperAdmin]);

  useEffect(() => {
    fetchRaces();
  }, [fetchRaces]);

  const filteredRaces = useMemo(() => {
    if (isSuperAdmin && leagueFilterMode === "unassociated") {
      return races.filter((r) => !r.leagueId);
    }
    return races;
  }, [races, isSuperAdmin, leagueFilterMode]);

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <ListOrdered className="h-6 w-6 text-[var(--color-primary,#3b82f6)]" />
        <h1 className="text-2xl font-bold text-[var(--foreground)]">Results Entry</h1>
      </div>

      <p className="text-sm text-[var(--muted-foreground,#6b7280)] mb-4">
        Select a race to enter or view results.
      </p>

      {/* League filter toggle - super admin only */}
      {isSuperAdmin && (
        <div className="flex gap-3 mb-4">
          <div className="flex items-center rounded-md border border-[var(--border)] bg-[var(--background)] overflow-hidden">
            <button
              onClick={() => setLeagueFilterMode("all")}
              className={`px-3 py-2 text-sm font-medium transition-colors ${
                leagueFilterMode === "all"
                  ? "bg-[var(--primary,#B87333)] text-white"
                  : "text-[var(--muted-foreground,#6b7280)] hover:text-[var(--foreground)]"
              }`}
            >
              All
            </button>
            <button
              onClick={() => setLeagueFilterMode("current")}
              className={`px-3 py-2 text-sm font-medium transition-colors ${
                leagueFilterMode === "current"
                  ? "bg-[var(--primary,#B87333)] text-white"
                  : "text-[var(--muted-foreground,#6b7280)] hover:text-[var(--foreground)]"
              }`}
            >
              Current League
            </button>
            <button
              onClick={() => setLeagueFilterMode("unassociated")}
              className={`px-3 py-2 text-sm font-medium transition-colors ${
                leagueFilterMode === "unassociated"
                  ? "bg-[var(--primary,#B87333)] text-white"
                  : "text-[var(--muted-foreground,#6b7280)] hover:text-[var(--foreground)]"
              }`}
            >
              Unassociated
            </button>
          </div>
        </div>
      )}

      {error && (
        <div className="mb-4 rounded-md bg-red-50 border border-red-200 p-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-[var(--color-primary,#3b82f6)] border-t-transparent" />
        </div>
      ) : (
        <div className="space-y-2">
          {filteredRaces.length === 0 ? (
            <p className="text-sm text-[var(--muted-foreground,#6b7280)]">No races available.</p>
          ) : (
            filteredRaces.map((race) => (
              <Link
                key={race._id}
                href={`/admin/races/${race._id}/results`}
                className="flex items-center justify-between rounded-lg border border-[var(--border)] px-4 py-3 hover:bg-[var(--muted,#f3f4f6)] transition-colors"
              >
                <div>
                  <p className="font-medium text-sm">{race.name}</p>
                  <p className="text-xs text-[var(--muted-foreground,#6b7280)]">
                    {race.date ? new Date(race.date).toLocaleDateString() : "No date"} · {race.location?.name || "Unknown"} · {resolveRaceType(race.raceType)}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                    race.status === "completed" ? "bg-green-100 text-green-700" :
                    race.status === "in_progress" ? "bg-yellow-100 text-yellow-700" :
                    race.status === "cancelled" ? "bg-red-100 text-red-700" :
                    "bg-blue-100 text-blue-700"
                  }`}>
                    {race.status?.replace("_", " ") || "scheduled"}
                  </span>
                  <ChevronRight className="h-4 w-4 text-[var(--muted-foreground,#6b7280)]" />
                </div>
              </Link>
            ))
          )}
        </div>
      )}
    </div>
  );
}
