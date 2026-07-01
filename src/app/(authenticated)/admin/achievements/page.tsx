"use client";

import React, { useEffect, useState, useCallback, useMemo } from "react";
import { Award, Plus, Pencil, Trash2, X } from "lucide-react";
import { adminFetch } from "@/lib/admin-fetch";
import { useLeagueStore } from "@/hooks/use-league-store";
import { useSeasonStore } from "@/hooks/use-season-store";
import { useUserStore } from "@/hooks/use-user-store";

interface Achievement {
  _id: string;
  name: string;
  description: string;
  triggerCriteria: {
    type: string;
    threshold: number;
  };
  badgeUrl: string;
  leagueId?: string;
  seasonId?: string;
  createdAt: string;
}

export default function AdminAchievementsPage() {
  const [achievements, setAchievements] = useState<Achievement[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [editingAchievement, setEditingAchievement] = useState<Achievement | null>(null);
  const [leagueFilterMode, setLeagueFilterMode] = useState<"all" | "current" | "unassociated">("current");

  const activeLeagueId = useLeagueStore((state) => state.activeLeagueId);
  const availableLeagues = useLeagueStore((state) => state.availableLeagues);
  const activeSeasonId = useSeasonStore((state) => state.activeSeasonId);
  const isSuperAdmin = useUserStore((state) => state.isSuperAdmin);

  // Form state
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    triggerType: "races_completed",
    threshold: "",
    badgeUrl: "",
    leagueId: "",
    seasonId: "",
  });
  const [formError, setFormError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  // Leagues and seasons for form dropdowns
  const [allLeagues, setAllLeagues] = useState<{ _id: string; name: string }[]>([]);
  const [formSeasons, setFormSeasons] = useState<{ _id: string; name: string }[]>([]);

  // Fetch all leagues for dropdown
  useEffect(() => {
    const fetchLeagues = async () => {
      try {
        const res = await adminFetch("/api/admin/leagues");
        if (res.ok) {
          const json = await res.json();
          setAllLeagues(json.data || []);
        }
      } catch {
        // silently fail
      }
    };
    fetchLeagues();
  }, []);

  // Determine which leagues to show in the dropdown
  const leagueOptions = useMemo(() => {
    if (isSuperAdmin) return allLeagues;
    // League admins: only show their available leagues
    return availableLeagues.map((l) => ({ _id: l.id, name: l.name }));
  }, [isSuperAdmin, allLeagues, availableLeagues]);

  // Fetch seasons when form's leagueId changes
  useEffect(() => {
    if (!formData.leagueId) { setFormSeasons([]); return; }
    // Only run when modal is open
    if (!showModal) return;
    const fetchFormSeasons = async () => {
      const res = await fetch(`/api/admin/seasons?leagueId=${formData.leagueId}`, {
        headers: { Authorization: `Bearer ${localStorage.getItem("accessToken")}` },
      });
      if (res.ok) {
        const json = await res.json();
        setFormSeasons(json.data || []);
      }
    };
    fetchFormSeasons();
  }, [formData.leagueId, showModal]);

  const fetchAchievements = useCallback(async () => {
    try {
      setLoading(true);
      // For super admin "all" mode, fetch without league scoping
      let res;
      if (isSuperAdmin && leagueFilterMode === "all") {
        res = await fetch("/api/admin/achievements", {
          headers: { Authorization: `Bearer ${localStorage.getItem("accessToken")}` },
        });
      } else {
        const params = new URLSearchParams();
        if (activeLeagueId) params.set("leagueId", activeLeagueId);
        if (activeSeasonId) params.set("seasonId", activeSeasonId);
        res = await fetch(`/api/admin/achievements?${params.toString()}`, {
          headers: { Authorization: `Bearer ${localStorage.getItem("accessToken")}` },
        });
      }
      if (!res.ok) throw new Error("Failed to fetch achievements");
      const json = await res.json();
      setAchievements(json.data || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setLoading(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeLeagueId, activeSeasonId, leagueFilterMode, isSuperAdmin]);

  useEffect(() => {
    fetchAchievements();
  }, [fetchAchievements]);

  // For "unassociated" mode, filter client-side
  const filteredAchievements = useMemo(() => {
    if (isSuperAdmin && leagueFilterMode === "unassociated") {
      return achievements.filter((a) => !a.leagueId);
    }
    return achievements;
  }, [achievements, isSuperAdmin, leagueFilterMode]);

  const openCreateModal = () => {
    setEditingAchievement(null);
    setFormData({ name: "", description: "", triggerType: "races_completed", threshold: "", badgeUrl: "", leagueId: activeLeagueId || "", seasonId: activeSeasonId || "" });
    setFormError(null);
    setShowModal(true);
  };

  const openEditModal = (achievement: Achievement) => {
    setEditingAchievement(achievement);
    setFormData({
      name: achievement.name,
      description: achievement.description,
      triggerType: achievement.triggerCriteria?.type || "races_completed",
      threshold: achievement.triggerCriteria?.threshold?.toString() || "",
      badgeUrl: achievement.badgeUrl || "",
      leagueId: achievement.leagueId || "",
      seasonId: achievement.seasonId || "",
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
      triggerCriteria: {
        type: formData.triggerType,
        threshold: Number(formData.threshold),
      },
      badgeUrl: formData.badgeUrl || undefined,
      leagueId: formData.leagueId,
      seasonId: formData.seasonId,
    };

    try {
      const url = editingAchievement
        ? `/api/admin/achievements/${editingAchievement._id}`
        : "/api/admin/achievements";
      const method = editingAchievement ? "PUT" : "POST";

      const res = await adminFetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const json = await res.json();
        throw new Error(json.message || "Failed to save achievement");
      }

      setShowModal(false);
      fetchAchievements();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (achievement: Achievement) => {
    if (!confirm(`Delete achievement "${achievement.name}"?`)) return;
    try {
      const res = await adminFetch(`/api/admin/achievements/${achievement._id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete achievement");
      fetchAchievements();
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Award className="h-6 w-6 text-[var(--color-primary,#3b82f6)]" />
          <h1 className="text-2xl font-bold text-[var(--foreground)]">Achievements</h1>
        </div>
        <button
          onClick={openCreateModal}
          className="flex items-center gap-2 rounded-md bg-[var(--color-primary,#3b82f6)] px-4 py-2 text-sm font-medium text-white hover:opacity-90 transition-opacity"
        >
          <Plus className="h-4 w-4" />
          Add Achievement
        </button>
      </div>

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
                <th className="px-4 py-3 text-left font-medium">Badge</th>
                <th className="px-4 py-3 text-left font-medium">Name</th>
                <th className="px-4 py-3 text-left font-medium">Description</th>
                <th className="px-4 py-3 text-left font-medium">Trigger</th>
                <th className="px-4 py-3 text-left font-medium">Threshold</th>
                <th className="px-4 py-3 text-right font-medium">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border)]">
              {filteredAchievements.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-[var(--muted-foreground,#6b7280)]">
                    No achievements found
                  </td>
                </tr>
              ) : (
                filteredAchievements.map((achievement) => (
                  <tr key={achievement._id} className="hover:bg-[var(--muted,#f3f4f6)]/50">
                    <td className="px-4 py-3">
                      {achievement.badgeUrl ? (
                        <img src={achievement.badgeUrl} alt="" className="h-8 w-8 rounded object-cover" />
                      ) : (
                        <div className="h-8 w-8 rounded bg-gray-200 flex items-center justify-center">
                          <Award className="h-4 w-4 text-gray-400" />
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3 font-medium">{achievement.name}</td>
                    <td className="px-4 py-3 text-[var(--muted-foreground,#6b7280)] max-w-xs truncate">
                      {achievement.description}
                    </td>
                    <td className="px-4 py-3 capitalize">
                      {achievement.triggerCriteria?.type?.replace("_", " ") || "—"}
                    </td>
                    <td className="px-4 py-3">{achievement.triggerCriteria?.threshold ?? "—"}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => openEditModal(achievement)}
                          className="rounded p-1 hover:bg-[var(--muted,#f3f4f6)] transition-colors"
                          title="Edit"
                        >
                          <Pencil className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(achievement)}
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
          <div className="w-full max-w-lg rounded-lg bg-[var(--background)] p-6 shadow-xl">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold">
                {editingAchievement ? "Edit Achievement" : "Add Achievement"}
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

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium mb-1">Trigger Type</label>
                  <select
                    value={formData.triggerType}
                    onChange={(e) => setFormData((p) => ({ ...p, triggerType: e.target.value }))}
                    className="w-full rounded-md border border-[var(--border)] px-3 py-2 text-sm"
                  >
                    <option value="races_completed">Races Completed</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Threshold</label>
                  <input
                    type="number"
                    required
                    min={1}
                    value={formData.threshold}
                    onChange={(e) => setFormData((p) => ({ ...p, threshold: e.target.value }))}
                    className="w-full rounded-md border border-[var(--border)] px-3 py-2 text-sm"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Badge URL</label>
                <input
                  type="text"
                  value={formData.badgeUrl}
                  onChange={(e) => setFormData((p) => ({ ...p, badgeUrl: e.target.value }))}
                  placeholder="https://example.com/badge.png"
                  className="w-full rounded-md border border-[var(--border)] px-3 py-2 text-sm"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium mb-1">League</label>
                  <select
                    required
                    value={formData.leagueId}
                    onChange={(e) => setFormData((p) => ({ ...p, leagueId: e.target.value, seasonId: "" }))}
                    className="w-full rounded-md border border-[var(--border)] px-3 py-2 text-sm"
                  >
                    <option value="">Select a league</option>
                    {leagueOptions.map((league) => (
                      <option key={league._id} value={league._id}>
                        {league.name}
                      </option>
                    ))}
                  </select>
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
                    {formSeasons.map((season) => (
                      <option key={season._id} value={season._id}>
                        {season.name}
                      </option>
                    ))}
                  </select>
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
                  {saving ? "Saving..." : editingAchievement ? "Update" : "Create"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
