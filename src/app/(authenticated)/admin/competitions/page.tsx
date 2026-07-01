"use client";

import React, { useEffect, useState, useCallback } from "react";
import { Trophy, Plus, Pencil, Trash2, X } from "lucide-react";
import { adminFetch } from "@/lib/admin-fetch";
import { useLeagueStore } from "@/hooks/use-league-store";
import { useSeasonStore } from "@/hooks/use-season-store";

interface Season {
  _id: string;
  name: string;
  isActive: boolean;
}

interface Competition {
  _id: string;
  name: string;
  description?: string;
  seasonId: string;
  type: string;
  scoringMethod: {
    type: string;
    pointsTable?: Record<string, number>;
    countBestN?: number;
  };
  eligibilityCriteria: {
    racerCriteria?: {
      categories?: string[];
      firstYearOnly?: boolean;
      minRaces?: number;
    };
    raceCriteria?: {
      raceTypes?: string[];
    };
  };
  isActive: boolean;
  createdAt: string;
}

const SCORING_TYPES = ["points", "time", "position_average"];
const CATEGORIES = ["cat1", "cat2", "cat3", "cat4", "cat5", "beginner"];
const RACE_TYPES = ["crit", "time_trial", "road_race", "cyclocross", "gravel", "track"];

export default function AdminCompetitionsPage() {
  const [competitions, setCompetitions] = useState<Competition[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [editingCompetition, setEditingCompetition] = useState<Competition | null>(null);

  const activeLeagueId = useLeagueStore((state) => state.activeLeagueId);
  const activeSeasonId = useSeasonStore((state) => state.activeSeasonId);

  // Form state
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    seasonId: "",
    type: "individual",
    scoringType: "points",
    countBestN: "",
    eligibleCategories: [] as string[],
    firstYearOnly: false,
    minRaces: "",
    eligibleRaceTypes: [] as string[],
  });
  const [formError, setFormError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [seasons, setSeasons] = useState<Season[]>([]);

  const fetchCompetitions = useCallback(async () => {
    try {
      setLoading(true);
      const res = await adminFetch("/api/admin/competitions");
      if (!res.ok) throw new Error("Failed to fetch competitions");
      const json = await res.json();
      setCompetitions(json.data || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setLoading(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeLeagueId]);

  const fetchSeasons = useCallback(async () => {
    try {
      const res = await adminFetch("/api/admin/seasons");
      if (res.ok) {
        const json = await res.json();
        setSeasons(json.data || []);
      }
    } catch {
      // Non-critical
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeLeagueId]);

  useEffect(() => {
    fetchCompetitions();
    fetchSeasons();
  }, [fetchCompetitions, fetchSeasons]);

  const openCreateModal = () => {
    setEditingCompetition(null);
    setFormData({
      name: "",
      description: "",
      seasonId: activeSeasonId || "",
      type: "individual",
      scoringType: "points",
      countBestN: "",
      eligibleCategories: [],
      firstYearOnly: false,
      minRaces: "",
      eligibleRaceTypes: [],
    });
    setFormError(null);
    setShowModal(true);
  };

  const openEditModal = (comp: Competition) => {
    setEditingCompetition(comp);
    setFormData({
      name: comp.name,
      description: comp.description || "",
      seasonId: comp.seasonId || "",
      type: comp.type,
      scoringType: comp.scoringMethod?.type || "points",
      countBestN: comp.scoringMethod?.countBestN?.toString() || "",
      eligibleCategories: comp.eligibilityCriteria?.racerCriteria?.categories || [],
      firstYearOnly: comp.eligibilityCriteria?.racerCriteria?.firstYearOnly || false,
      minRaces: comp.eligibilityCriteria?.racerCriteria?.minRaces?.toString() || "",
      eligibleRaceTypes: comp.eligibilityCriteria?.raceCriteria?.raceTypes || [],
    });
    setFormError(null);
    setShowModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setFormError(null);

    const payload = {
      name: formData.name,
      description: formData.description || undefined,
      seasonId: formData.seasonId || undefined,
      type: formData.type,
      scoringMethod: {
        type: formData.scoringType,
        countBestN: formData.countBestN ? Number(formData.countBestN) : undefined,
      },
      eligibilityCriteria: {
        racerCriteria: {
          categories: formData.eligibleCategories.length > 0 ? formData.eligibleCategories : undefined,
          firstYearOnly: formData.firstYearOnly || undefined,
          minRaces: formData.minRaces ? Number(formData.minRaces) : undefined,
        },
        raceCriteria: {
          raceTypes: formData.eligibleRaceTypes.length > 0 ? formData.eligibleRaceTypes : undefined,
        },
      },
    };

    try {
      const url = editingCompetition
        ? `/api/admin/competitions/${editingCompetition._id}`
        : "/api/admin/competitions";
      const method = editingCompetition ? "PUT" : "POST";

      const res = await adminFetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const json = await res.json();
        throw new Error(json.message || "Failed to save competition");
      }

      setShowModal(false);
      fetchCompetitions();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (comp: Competition) => {
    if (!confirm(`Delete competition "${comp.name}"?`)) return;
    try {
      const res = await adminFetch(`/api/admin/competitions/${comp._id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete competition");
      fetchCompetitions();
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Trophy className="h-6 w-6 text-[var(--color-primary,#3b82f6)]" />
          <h1 className="text-2xl font-bold text-[var(--foreground)]">Competitions</h1>
        </div>
        <button
          onClick={openCreateModal}
          className="flex items-center gap-2 rounded-md bg-[var(--color-primary,#3b82f6)] px-4 py-2 text-sm font-medium text-white hover:opacity-90 transition-opacity"
        >
          <Plus className="h-4 w-4" />
          Add Competition
        </button>
      </div>

      {error && (
        <div className="mb-4 rounded-md bg-red-50 border border-red-200 p-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* Table */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-[var(--color-primary,#3b82f6)] border-t-transparent" />
        </div>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-[var(--border)]">
          <table className="w-full text-sm">
            <thead className="bg-[var(--muted,#f3f4f6)]">
              <tr>
                <th className="px-4 py-3 text-left font-medium">Name</th>
                <th className="px-4 py-3 text-left font-medium">Type</th>
                <th className="px-4 py-3 text-left font-medium">Scoring</th>
                <th className="px-4 py-3 text-left font-medium">Eligibility</th>
                <th className="px-4 py-3 text-left font-medium">Status</th>
                <th className="px-4 py-3 text-right font-medium">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border)]">
              {competitions.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-[var(--muted-foreground,#6b7280)]">
                    No competitions found
                  </td>
                </tr>
              ) : (
                competitions.map((comp) => (
                  <tr key={comp._id} className="hover:bg-[var(--muted,#f3f4f6)]/50">
                    <td className="px-4 py-3 font-medium">{comp.name}</td>
                    <td className="px-4 py-3 capitalize">{comp.type}</td>
                    <td className="px-4 py-3 capitalize">
                      {comp.scoringMethod?.type?.replace("_", " ") || "—"}
                      {comp.scoringMethod?.countBestN && ` (best ${comp.scoringMethod.countBestN})`}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-1">
                        {comp.eligibilityCriteria?.racerCriteria?.categories?.map((c) => (
                          <span key={c} className="text-xs bg-gray-100 px-1.5 py-0.5 rounded">{c}</span>
                        ))}
                        {comp.eligibilityCriteria?.racerCriteria?.firstYearOnly && (
                          <span className="text-xs bg-yellow-100 px-1.5 py-0.5 rounded">Rookies</span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                        comp.isActive ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-600"
                      }`}>
                        {comp.isActive ? "Active" : "Inactive"}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => openEditModal(comp)}
                          className="rounded p-1 hover:bg-[var(--muted,#f3f4f6)] transition-colors"
                          title="Edit"
                        >
                          <Pencil className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(comp)}
                          className="rounded p-1 hover:bg-red-50 text-red-600 transition-colors"
                          title="Delete"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="w-full max-w-2xl rounded-lg bg-[var(--background)] p-6 shadow-xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold">
                {editingCompetition ? "Edit Competition" : "Add Competition"}
              </h2>
              <button onClick={() => setShowModal(false)} className="rounded p-1 hover:bg-[var(--muted,#f3f4f6)]">
                <X className="h-5 w-5" />
              </button>
            </div>

            {formError && (
              <div className="mb-4 rounded-md bg-red-50 border border-red-200 p-3 text-sm text-red-700">
                {formError}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Name</label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData((p) => ({ ...p, name: e.target.value }))}
                  className="w-full rounded-md border border-[var(--border)] px-3 py-2 text-sm"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Description</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData((p) => ({ ...p, description: e.target.value }))}
                  className="w-full rounded-md border border-[var(--border)] px-3 py-2 text-sm"
                  rows={2}
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Season</label>
                <select
                  required
                  value={formData.seasonId}
                  onChange={(e) => setFormData((p) => ({ ...p, seasonId: e.target.value }))}
                  className="w-full rounded-md border border-[var(--border)] px-3 py-2 text-sm"
                >
                  <option value="">Select a season</option>
                  {seasons.map((s) => (
                    <option key={s._id} value={s._id}>
                      {s.name} {s.isActive ? "(active)" : ""}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium mb-1">Type</label>
                  <select
                    value={formData.type}
                    onChange={(e) => setFormData((p) => ({ ...p, type: e.target.value }))}
                    className="w-full rounded-md border border-[var(--border)] px-3 py-2 text-sm"
                  >
                    <option value="individual">Individual</option>
                    <option value="team">Team</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Scoring Method</label>
                  <select
                    value={formData.scoringType}
                    onChange={(e) => setFormData((p) => ({ ...p, scoringType: e.target.value }))}
                    className="w-full rounded-md border border-[var(--border)] px-3 py-2 text-sm"
                  >
                    {SCORING_TYPES.map((s) => (
                      <option key={s} value={s}>{s.replace("_", " ")}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Count Best N Results (optional)</label>
                <input
                  type="number"
                  min={1}
                  value={formData.countBestN}
                  onChange={(e) => setFormData((p) => ({ ...p, countBestN: e.target.value }))}
                  placeholder="Leave empty to count all"
                  className="w-full rounded-md border border-[var(--border)] px-3 py-2 text-sm"
                />
              </div>

              {/* Eligibility Criteria */}
              <div className="border-t border-[var(--border)] pt-4">
                <h3 className="text-sm font-semibold mb-3">Eligibility Criteria</h3>

                <div className="space-y-3">
                  <div>
                    <label className="block text-sm font-medium mb-2">Eligible Categories</label>
                    <div className="flex flex-wrap gap-2">
                      {CATEGORIES.map((cat) => (
                        <label
                          key={cat}
                          className="flex items-center gap-1.5 rounded-md border border-[var(--border)] px-3 py-1.5 text-sm cursor-pointer hover:bg-[var(--muted,#f3f4f6)]"
                        >
                          <input
                            type="checkbox"
                            checked={formData.eligibleCategories.includes(cat)}
                            onChange={() => {
                              setFormData((p) => ({
                                ...p,
                                eligibleCategories: p.eligibleCategories.includes(cat)
                                  ? p.eligibleCategories.filter((c) => c !== cat)
                                  : [...p.eligibleCategories, cat],
                              }));
                            }}
                            className="rounded"
                          />
                          <span className="capitalize">{cat}</span>
                        </label>
                      ))}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="flex items-center gap-2 text-sm">
                        <input
                          type="checkbox"
                          checked={formData.firstYearOnly}
                          onChange={(e) => setFormData((p) => ({ ...p, firstYearOnly: e.target.checked }))}
                          className="rounded"
                        />
                        First Year Riders Only
                      </label>
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1">Min Races</label>
                      <input
                        type="number"
                        min={0}
                        value={formData.minRaces}
                        onChange={(e) => setFormData((p) => ({ ...p, minRaces: e.target.value }))}
                        className="w-full rounded-md border border-[var(--border)] px-3 py-2 text-sm"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-2">Eligible Race Types</label>
                    <div className="flex flex-wrap gap-2">
                      {RACE_TYPES.map((rt) => (
                        <label
                          key={rt}
                          className="flex items-center gap-1.5 rounded-md border border-[var(--border)] px-3 py-1.5 text-sm cursor-pointer hover:bg-[var(--muted,#f3f4f6)]"
                        >
                          <input
                            type="checkbox"
                            checked={formData.eligibleRaceTypes.includes(rt)}
                            onChange={() => {
                              setFormData((p) => ({
                                ...p,
                                eligibleRaceTypes: p.eligibleRaceTypes.includes(rt)
                                  ? p.eligibleRaceTypes.filter((r) => r !== rt)
                                  : [...p.eligibleRaceTypes, rt],
                              }));
                            }}
                            className="rounded"
                          />
                          <span className="capitalize">{rt.replace("_", " ")}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="rounded-md border border-[var(--border)] px-4 py-2 text-sm font-medium hover:bg-[var(--muted,#f3f4f6)]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="rounded-md bg-[var(--color-primary,#3b82f6)] px-4 py-2 text-sm font-medium text-white hover:opacity-90 disabled:opacity-50"
                >
                  {saving ? "Saving..." : editingCompetition ? "Update" : "Create"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
