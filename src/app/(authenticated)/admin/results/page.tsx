"use client";

import React, { useEffect, useState } from "react";
import { ListOrdered, ChevronRight } from "lucide-react";
import Link from "next/link";
import { adminFetch } from "@/lib/admin-fetch";
import { useReferenceData } from "@/hooks/use-reference-data";

interface Race {
  _id: string;
  name: string;
  date: string;
  status: string;
  raceType: string;
  location: { name: string };
}

export default function AdminResultsPage() {
  const [races, setRaces] = useState<Race[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { resolveKey: resolveRaceType } = useReferenceData("race_type");

  useEffect(() => {
    const fetchRaces = async () => {
      try {
        const res = await adminFetch("/api/admin/races");
        if (!res.ok) throw new Error("Failed to fetch races");
        const json = await res.json();
        setRaces(json.data || []);
      } catch (err) {
        setError(err instanceof Error ? err.message : "An error occurred");
      } finally {
        setLoading(false);
      }
    };
    fetchRaces();
  }, []);

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
          {races.length === 0 ? (
            <p className="text-sm text-[var(--muted-foreground,#6b7280)]">No races available.</p>
          ) : (
            races.map((race) => (
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
