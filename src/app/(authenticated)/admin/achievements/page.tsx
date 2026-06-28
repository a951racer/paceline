"use client";

import React, { useEffect, useState, useCallback } from "react";
import { Award, Plus, Pencil, Trash2, X } from "lucide-react";

interface Achievement {
  _id: string;
  name: string;
  description: string;
  triggerCriteria: {
    type: string;
    threshold: number;
  };
  badgeUrl: string;
  createdAt: string;
}

export default function AdminAchievementsPage() {
  const [achievements, setAchievements] = useState<Achievement[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [editingAchievement, setEditingAchievement] = useState<Achievement | null>(null);

  // Form state
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    triggerType: "races_completed",
    threshold: "",
    badgeUrl: "",
  });
  const [formError, setFormError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const fetchAchievements = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/admin/achievements");
      if (!res.ok) throw new Error("Failed to fetch achievements");
      const json = await res.json();
      setAchievements(json.data || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAchievements();
  }, [fetchAchievements]);

  const openCreateModal = () => {
    setEditingAchievement(null);
    setFormData({ name: "", description: "", triggerType: "races_completed", threshold: "", badgeUrl: "" });
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
      description: formData.description,
      triggerCriteria: {
        type: formData.triggerType,
        threshold: Number(formData.threshold),
      },
      badgeUrl: formData.badgeUrl,
    };

    try {
      const url = editingAchievement
        ? `/api/admin/achievements/${editingAchievement._id}`
        : "/api/admin/achievements";
      const method = editingAchievement ? "PUT" : "POST";

      const res = await fetch(url, {
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
      const res = await fetch(`/api/admin/achievements/${achievement._id}`, { method: "DELETE" });
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
              {achievements.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-[var(--muted-foreground,#6b7280)]">
                    No achievements found
                  </td>
                </tr>
              ) : (
                achievements.map((achievement) => (
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
                  required
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
