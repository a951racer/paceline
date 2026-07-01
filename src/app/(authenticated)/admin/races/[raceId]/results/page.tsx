"use client";

import React, { useEffect, useState, useMemo } from "react";
import { ListOrdered, Plus, Trash2, AlertCircle, CheckCircle2 } from "lucide-react";
import { useParams } from "next/navigation";
import { adminFetch } from "@/lib/admin-fetch";

interface ResultEntry {
  racerId: string;
  category: string;
  position: number | "";
  finishTime: number | "";
}

interface ExistingResult {
  _id: string;
  racerId: string;
  category: string;
  position: number;
  finishTime: number;
  points?: number;
}

interface Race {
  _id: string;
  name: string;
  date: string;
  status: string;
  leagueId?: string;
  seasonId?: string;
}

interface CategoryItem {
  key: string;
  label: string;
  isActive: boolean;
}

export default function AdminRaceResultsPage() {
  const params = useParams();
  const raceId = params.raceId as string;

  const [race, setRace] = useState<Race | null>(null);
  const [leagueName, setLeagueName] = useState<string>("");
  const [seasonName, setSeasonName] = useState<string>("");
  const [categoryItems, setCategoryItems] = useState<CategoryItem[]>([]);
  const [people, setPeople] = useState<{_id: string; name: {first: string; last: string}}[]>([]);
  const [existingResults, setExistingResults] = useState<ExistingResult[]>([]);
  const [entries, setEntries] = useState<ResultEntry[]>([
    { racerId: "", category: "", position: "", finishTime: "" },
  ]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);

  // Resolve category key to label using the race's league data
  const resolveCategory = useMemo(() => {
    const lookup = new Map<string, string>();
    for (const item of categoryItems) {
      lookup.set(item.key, item.label);
    }
    return (key: string): string => lookup.get(key) ?? key;
  }, [categoryItems]);

  const activeCategoryItems = useMemo(
    () => categoryItems.filter((c) => c.isActive),
    [categoryItems]
  );

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const token = localStorage.getItem("accessToken");
        const authHeaders = { Authorization: `Bearer ${token}` };

        // Fetch race info
        const raceRes = await adminFetch(`/api/admin/races/${raceId}`);
        if (raceRes.ok) {
          const raceJson = await raceRes.json();
          const raceData = raceJson.data;
          setRace(raceData);

          // Fetch category reference data using the race's league
          if (raceData.leagueId) {
            const catRes = await fetch(
              `/api/admin/reference-data?type=category&leagueId=${raceData.leagueId}`,
              { headers: authHeaders }
            );
            if (catRes.ok) {
              const catJson = await catRes.json();
              setCategoryItems(catJson.data ?? catJson);
            }

            // Fetch league name
            const leagueRes = await fetch(
              `/api/admin/leagues/${raceData.leagueId}`,
              { headers: authHeaders }
            );
            if (leagueRes.ok) {
              const leagueJson = await leagueRes.json();
              setLeagueName(leagueJson.data?.name || "");
            }
          }

          // Fetch season name
          if (raceData.seasonId) {
            const seasonRes = await fetch(
              `/api/admin/seasons/${raceData.seasonId}?leagueId=${raceData.leagueId}`,
              { headers: authHeaders }
            );
            if (seasonRes.ok) {
              const seasonJson = await seasonRes.json();
              setSeasonName(seasonJson.data?.name || "");
            }
          }
        }

        // Fetch existing results
        const resultsRes = await adminFetch(`/api/admin/races/${raceId}/results`);
        if (resultsRes.ok) {
          const resultsJson = await resultsRes.json();
          setExistingResults(resultsJson.data || []);
        }

        // Fetch people list
        const peopleRes = await adminFetch("/api/admin/people");
        if (peopleRes.ok) {
          const peopleJson = await peopleRes.json();
          setPeople(peopleJson.data || []);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load data");
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [raceId]);

  const getPersonName = (id: string) => {
    const p = people.find(x => x._id === id);
    return p ? `${p.name.first} ${p.name.last}` : id;
  };

  const addEntry = () => {
    const defaultCategory = activeCategoryItems.length > 0 ? activeCategoryItems[0].key : "";
    setEntries((prev) => [...prev, { racerId: "", category: defaultCategory, position: "", finishTime: "" }]);
  };

  const removeEntry = (index: number) => {
    setEntries((prev) => prev.filter((_, i) => i !== index));
  };

  const updateEntry = (index: number, field: keyof ResultEntry, value: string | number) => {
    setEntries((prev) =>
      prev.map((entry, i) => (i === index ? { ...entry, [field]: value } : entry))
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    setSuccess(null);
    setValidationErrors([]);

    // Validate entries
    const errors: string[] = [];
    const validEntries = entries.filter((entry, i) => {
      if (!entry.racerId) { errors.push(`Row ${i + 1}: Racer is required`); return false; }
      if (!entry.position || entry.position < 1) { errors.push(`Row ${i + 1}: Position must be at least 1`); return false; }
      if (entry.finishTime === "" || Number(entry.finishTime) < 0) { errors.push(`Row ${i + 1}: Finish time must be non-negative`); return false; }
      return true;
    });

    if (errors.length > 0) {
      setValidationErrors(errors);
      setSubmitting(false);
      return;
    }

    const payload = validEntries.map((entry) => ({
      racerId: entry.racerId,
      category: entry.category,
      position: Number(entry.position),
      finishTime: Number(entry.finishTime),
    }));

    try {
      const res = await adminFetch(`/api/admin/races/${raceId}/results`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const json = await res.json();

      if (!res.ok) {
        if (json.data?.errors) {
          setValidationErrors(json.data.errors.map((e: { racerId: string; error: string }) => `${e.racerId}: ${e.error}`));
        }
        throw new Error(json.message || "Failed to submit results");
      }

      const data = json.data;
      setSuccess(`Successfully entered ${data.successful?.length || 0} results. ${data.errors?.length || 0} errors.`);
      if (data.errors?.length > 0) {
        setValidationErrors(data.errors.map((e: { racerId: string; error: string }) => `${e.racerId}: ${e.error}`));
      }

      // Refresh existing results
      const resultsRes = await adminFetch(`/api/admin/races/${raceId}/results`);
      if (resultsRes.ok) {
        const resultsJson = await resultsRes.json();
        setExistingResults(resultsJson.data || []);
      }

      // Reset entries
      setEntries([{ racerId: "", category: "", position: "", finishTime: "" }]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-[var(--color-primary,#3b82f6)] border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <ListOrdered className="h-6 w-6 text-[var(--color-primary,#3b82f6)]" />
        <div>
          <h1 className="text-2xl font-bold text-[var(--foreground)]">Results Entry</h1>
          {(leagueName || seasonName) && (
            <p className="text-sm font-medium text-[var(--primary,#B87333)]">
              {leagueName}{leagueName && seasonName ? " — " : ""}{seasonName}
            </p>
          )}
          {race && (
            <p className="text-sm text-[var(--muted-foreground,#6b7280)]">
              {race.name} — {new Date(race.date).toLocaleDateString()}
            </p>
          )}
        </div>
      </div>

      {/* Existing Results */}
      {existingResults.length > 0 && (
        <div className="mb-6">
          <h2 className="text-lg font-semibold mb-3">Existing Results ({existingResults.length})</h2>
          <div className="overflow-x-auto rounded-lg border border-[var(--border)]">
            <table className="w-full text-sm">
              <thead className="bg-[var(--muted,#f3f4f6)]">
                <tr>
                  <th className="px-4 py-2 text-left font-medium">Position</th>
                  <th className="px-4 py-2 text-left font-medium">Racer</th>
                  <th className="px-4 py-2 text-left font-medium">Category</th>
                  <th className="px-4 py-2 text-left font-medium">Finish Time (ms)</th>
                  <th className="px-4 py-2 text-left font-medium">Points</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border)]">
                {existingResults
                  .sort((a, b) => a.category.localeCompare(b.category) || a.position - b.position)
                  .map((result) => (
                    <tr key={result._id}>
                      <td className="px-4 py-2 font-medium">{result.position}</td>
                      <td className="px-4 py-2">{getPersonName(result.racerId)}</td>
                      <td className="px-4 py-2">{resolveCategory(result.category)}</td>
                      <td className="px-4 py-2">{result.finishTime.toLocaleString()}</td>
                      <td className="px-4 py-2">{result.points ?? "—"}</td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Alerts */}
      {error && (
        <div className="mb-4 flex items-center gap-2 rounded-md bg-red-50 border border-red-200 p-3 text-sm text-red-700">
          <AlertCircle className="h-4 w-4 shrink-0" />
          {error}
        </div>
      )}
      {success && (
        <div className="mb-4 flex items-center gap-2 rounded-md bg-green-50 border border-green-200 p-3 text-sm text-green-700">
          <CheckCircle2 className="h-4 w-4 shrink-0" />
          {success}
        </div>
      )}
      {validationErrors.length > 0 && (
        <div className="mb-4 rounded-md bg-yellow-50 border border-yellow-200 p-3 text-sm text-yellow-800">
          <p className="font-medium mb-1">Validation Errors:</p>
          <ul className="list-disc pl-4 space-y-0.5">
            {validationErrors.map((err, i) => (
              <li key={i}>{err}</li>
            ))}
          </ul>
        </div>
      )}

      {/* Bulk Entry Form */}
      <div className="rounded-lg border border-[var(--border)] p-4">
        <h2 className="text-lg font-semibold mb-4">Add Results</h2>
        <form onSubmit={handleSubmit}>
          <div className="space-y-3">
            {/* Header */}
            <div className="grid grid-cols-[1fr_120px_80px_120px_40px] gap-2 text-xs font-medium text-[var(--muted-foreground,#6b7280)]">
              <span>Racer</span>
              <span>Category</span>
              <span>Position</span>
              <span>Finish Time (ms)</span>
              <span></span>
            </div>

            {entries.map((entry, index) => (
              <div key={index} className="grid grid-cols-[1fr_120px_80px_120px_40px] gap-2">
                <select
                  value={entry.racerId}
                  onChange={(e) => updateEntry(index, "racerId", e.target.value)}
                  className="rounded-md border border-[var(--border)] px-3 py-2 text-sm"
                >
                  <option value="">Select racer...</option>
                  {people.map((p) => (
                    <option key={p._id} value={p._id}>{p.name.first} {p.name.last}</option>
                  ))}
                </select>
                <select
                  value={entry.category}
                  onChange={(e) => updateEntry(index, "category", e.target.value)}
                  className="rounded-md border border-[var(--border)] px-2 py-2 text-sm"
                >
                  <option value="">Select...</option>
                  {activeCategoryItems.map((c) => (
                    <option key={c.key} value={c.key}>{c.label}</option>
                  ))}
                </select>
                <input
                  type="number"
                  placeholder="Pos"
                  min={1}
                  value={entry.position}
                  onChange={(e) => updateEntry(index, "position", e.target.value ? Number(e.target.value) : "")}
                  className="rounded-md border border-[var(--border)] px-2 py-2 text-sm"
                />
                <input
                  type="number"
                  placeholder="ms"
                  min={0}
                  value={entry.finishTime}
                  onChange={(e) => updateEntry(index, "finishTime", e.target.value ? Number(e.target.value) : "")}
                  className="rounded-md border border-[var(--border)] px-2 py-2 text-sm"
                />
                <button
                  type="button"
                  onClick={() => removeEntry(index)}
                  disabled={entries.length === 1}
                  className="rounded p-1 hover:bg-red-50 text-red-600 disabled:opacity-30 disabled:cursor-not-allowed"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>

          <div className="flex items-center justify-between mt-4 pt-4 border-t border-[var(--border)]">
            <button
              type="button"
              onClick={addEntry}
              className="flex items-center gap-1 text-sm font-medium text-[var(--color-primary,#3b82f6)] hover:underline"
            >
              <Plus className="h-4 w-4" />
              Add Row
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="rounded-md bg-[var(--color-primary,#3b82f6)] px-4 py-2 text-sm font-medium text-white hover:opacity-90 disabled:opacity-50"
            >
              {submitting ? "Submitting..." : "Submit Results"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
