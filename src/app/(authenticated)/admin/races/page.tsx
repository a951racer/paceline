"use client";

import React, { useEffect, useState, useCallback } from "react";
import { Flag, Plus, Pencil, Trash2, X, ListOrdered } from "lucide-react";
import Link from "next/link";

interface Race {
  _id: string;
  name: string;
  date: string;
  location: { name: string; address?: string };
  raceType: string;
  categories: string[];
  seasonId?: string;
  status: string;
  officialIds: string[];
  volunteerIds: string[];
  createdAt: string;
}

const RACE_TYPES = ["crit", "time_trial", "road_race", "cyclocross", "gravel", "track"];
const STATUSES = ["scheduled", "in_progress", "completed", "cancelled"];
const CATEGORIES = ["cat1", "cat2", "cat3", "cat4", "cat5", "beginner"];

export default function AdminRacesPage() {
  const [races, setRaces] = useState<Race[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [editingRace, setEditingRace] = useState<Race | null>(null);
  const [statusFilter, setStatusFilter] = useState("");
  const [typeFilter, setTypeFilter] = useState("");

  // Form state
  const [formData, setFormData] = useState({
    name: "",
    date: "",
    locationName: "",
    locationAddress: "",
    raceType: "crit",
    categories: [] as string[],
    status: "scheduled",
  });
  const [formError, setFormError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const fetchRaces = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/admin/races");
      if (!res.ok) throw new Error("Failed to fetch races");
      const json = await res.json();
      let data = json.data || [];
      if (statusFilter) data = data.filter((r: Race) => r.status === statusFilter);
      if (typeFilter) data = data.filter((r: Race) => r.raceType === typeFilter);
      setRaces(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setLoading(false);
    }
  }, [statusFilter, typeFilter]);

  useEffect(() => {
    fetchRaces();
  }, [fetchRaces]);

  const openCreateModal = () => {
    setEditingRace(null);
    setFormData({
      name: "",
      date: "",
      locationName: "",
      locationAddress: "",
      raceType: "crit",
      categories: [],
      status: "scheduled",
    });
    setFormError(null);
    setShowModal(true);
  };

  const openEditModal = (race: Race) => {
    setEditingRace(race);
    setFormData({
      name: race.name,
      date: race.date ? race.date.slice(0, 10) : "",
      locationName: race.location?.name || "",
      locationAddress: race.location?.address || "",
      raceType: race.raceType,
      categories: race.categories || [],
      status: race.status,
    });
    setFormError(null);
    setShowModal(true);
  };

  const handleCategoryToggle = (cat: string) => {
    setFormData((prev) => ({
      ...prev,
      categories: prev.categories.includes(cat)
        ? prev.categories.filter((c) => c !== cat)
        : [...prev.categories, cat],
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setFormError(null);

    const payload = {
      name: formData.name,
      date: formData.date,
      location: { name: formData.locationName, address: formData.locationAddress || undefined },
      raceType: formData.raceType,
      categories: formData.categories,
      status: formData.status,
    };

    try {
      const url = editingRace ? `/api/admin/races/${editingRace._id}` : "/api/admin/races";
      const method = editingRace ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const json = await res.json();
        throw new Error(json.message || "Failed to save race");
      }

      setShowModal(false);
      fetchRaces();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (race: Race) => {
    if (!confirm(`Delete race "${race.name}"?`)) return;
    try {
      const res = await fetch(`/api/admin/races/${race._id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete race");
      fetchRaces();
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Flag className="h-6 w-6 text-[var(--color-primary,#3b82f6)]" />
          <h1 className="text-2xl font-bold text-[var(--foreground)]">Races</h1>
        </div>
        <button
          onClick={openCreateModal}
          className="flex items-center gap-2 rounded-md bg-[var(--color-primary,#3b82f6)] px-4 py-2 text-sm font-medium text-white hover:opacity-90 transition-opacity"
        >
          <Plus className="h-4 w-4" />
          Add Race
        </button>
      </div>

      {/* Filters */}
      <div className="flex gap-3 mb-4">
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="rounded-md border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-sm"
        >
          <option value="">All Statuses</option>
          {STATUSES.map((s) => (
            <option key={s} value={s} className="capitalize">{s.replace("_", " ")}</option>
          ))}
        </select>
        <select
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value)}
          className="rounded-md border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-sm"
        >
          <option value="">All Types</option>
          {RACE_TYPES.map((t) => (
            <option key={t} value={t}>{t.replace("_", " ")}</option>
          ))}
        </select>
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
                <th className="px-4 py-3 text-left font-medium">Date</th>
                <th className="px-4 py-3 text-left font-medium">Location</th>
                <th className="px-4 py-3 text-left font-medium">Type</th>
                <th className="px-4 py-3 text-left font-medium">Status</th>
                <th className="px-4 py-3 text-right font-medium">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border)]">
              {races.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-[var(--muted-foreground,#6b7280)]">
                    No races found
                  </td>
                </tr>
              ) : (
                races.map((race) => (
                  <tr key={race._id} className="hover:bg-[var(--muted,#f3f4f6)]/50">
                    <td className="px-4 py-3 font-medium">{race.name}</td>
                    <td className="px-4 py-3">{race.date ? new Date(race.date).toLocaleDateString() : "—"}</td>
                    <td className="px-4 py-3">{race.location?.name || "—"}</td>
                    <td className="px-4 py-3 capitalize">{race.raceType?.replace("_", " ") || "—"}</td>
                    <td className="px-4 py-3">
                      <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                        race.status === "completed" ? "bg-green-100 text-green-700" :
                        race.status === "in_progress" ? "bg-yellow-100 text-yellow-700" :
                        race.status === "cancelled" ? "bg-red-100 text-red-700" :
                        "bg-blue-100 text-blue-700"
                      }`}>
                        {race.status?.replace("_", " ") || "scheduled"}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-2">
                        <Link
                          href={`/admin/races/${race._id}/results`}
                          className="rounded p-1 hover:bg-[var(--muted,#f3f4f6)] transition-colors"
                          title="Enter Results"
                        >
                          <ListOrdered className="h-4 w-4" />
                        </Link>
                        <button
                          onClick={() => openEditModal(race)}
                          className="rounded p-1 hover:bg-[var(--muted,#f3f4f6)] transition-colors"
                          title="Edit"
                        >
                          <Pencil className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(race)}
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
          <div className="w-full max-w-lg rounded-lg bg-[var(--background)] p-6 shadow-xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold">
                {editingRace ? "Edit Race" : "Add Race"}
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
                <label className="block text-sm font-medium mb-1">Race Name</label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData((p) => ({ ...p, name: e.target.value }))}
                  className="w-full rounded-md border border-[var(--border)] px-3 py-2 text-sm"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Date</label>
                <input
                  type="date"
                  required
                  value={formData.date}
                  onChange={(e) => setFormData((p) => ({ ...p, date: e.target.value }))}
                  className="w-full rounded-md border border-[var(--border)] px-3 py-2 text-sm"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium mb-1">Location Name</label>
                  <input
                    type="text"
                    required
                    value={formData.locationName}
                    onChange={(e) => setFormData((p) => ({ ...p, locationName: e.target.value }))}
                    className="w-full rounded-md border border-[var(--border)] px-3 py-2 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Address</label>
                  <input
                    type="text"
                    value={formData.locationAddress}
                    onChange={(e) => setFormData((p) => ({ ...p, locationAddress: e.target.value }))}
                    className="w-full rounded-md border border-[var(--border)] px-3 py-2 text-sm"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium mb-1">Race Type</label>
                  <select
                    value={formData.raceType}
                    onChange={(e) => setFormData((p) => ({ ...p, raceType: e.target.value }))}
                    className="w-full rounded-md border border-[var(--border)] px-3 py-2 text-sm"
                  >
                    {RACE_TYPES.map((t) => (
                      <option key={t} value={t}>{t.replace("_", " ")}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Status</label>
                  <select
                    value={formData.status}
                    onChange={(e) => setFormData((p) => ({ ...p, status: e.target.value }))}
                    className="w-full rounded-md border border-[var(--border)] px-3 py-2 text-sm"
                  >
                    {STATUSES.map((s) => (
                      <option key={s} value={s}>{s.replace("_", " ")}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Categories</label>
                <div className="flex flex-wrap gap-2">
                  {CATEGORIES.map((cat) => (
                    <label
                      key={cat}
                      className="flex items-center gap-1.5 rounded-md border border-[var(--border)] px-3 py-1.5 text-sm cursor-pointer hover:bg-[var(--muted,#f3f4f6)]"
                    >
                      <input
                        type="checkbox"
                        checked={formData.categories.includes(cat)}
                        onChange={() => handleCategoryToggle(cat)}
                        className="rounded"
                      />
                      <span className="capitalize">{cat}</span>
                    </label>
                  ))}
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
                  {saving ? "Saving..." : editingRace ? "Update" : "Create"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
