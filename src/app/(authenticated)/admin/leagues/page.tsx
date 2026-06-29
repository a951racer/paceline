"use client";

import React, { useEffect, useState, useCallback } from "react";
import {
  Globe,
  Plus,
  Pencil,
  X,
  Power,
  PowerOff,
  Shield,
  UserPlus,
  Loader2,
} from "lucide-react";
import { adminFetch } from "@/lib/admin-fetch";
import { useLeagueStore } from "@/hooks/use-league-store";

interface League {
  _id: string;
  name: string;
  description?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

interface Person {
  _id: string;
  name: { first: string; last: string };
  email: string;
  roles: string[];
  adminScope?: {
    type: "super" | "league";
    leagueIds?: string[];
  };
}

/**
 * League Admin Page - Super_Admin only.
 *
 * - Lists all leagues with status (active/inactive)
 * - Create/edit/deactivate league forms
 * - League_Admin assignment interface (assign persons to leagues)
 *
 * Requirements: 1.1, 1.2, 1.5, 12.3, 12.7
 */
export default function LeagueAdminPage() {
  const [leagues, setLeagues] = useState<League[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showLeagueModal, setShowLeagueModal] = useState(false);
  const [editingLeague, setEditingLeague] = useState<League | null>(null);
  const [showAssignModal, setShowAssignModal] = useState(false);

  const setAvailableLeagues = useLeagueStore((state) => state.setAvailableLeagues);

  // League form state
  const [leagueForm, setLeagueForm] = useState({ name: "", description: "" });
  const [leagueFormError, setLeagueFormError] = useState<string | null>(null);
  const [savingLeague, setSavingLeague] = useState(false);

  // Assignment state
  const [people, setPeople] = useState<Person[]>([]);
  const [loadingPeople, setLoadingPeople] = useState(false);
  const [selectedPersonId, setSelectedPersonId] = useState("");
  const [selectedLeagueIds, setSelectedLeagueIds] = useState<string[]>([]);
  const [assignError, setAssignError] = useState<string | null>(null);
  const [assigning, setAssigning] = useState(false);

  const fetchLeagues = useCallback(async () => {
    try {
      setLoading(true);
      const res = await adminFetch("/api/admin/leagues");
      if (!res.ok) throw new Error("Failed to fetch leagues");
      const json = await res.json();
      const data = json.data || [];
      setLeagues(data);

      // Sync the league store so the top-bar selector stays up to date
      const activeLeagues = data
        .filter((l: League) => l.isActive)
        .map((l: League) => ({ id: l._id, name: l.name }));
      setAvailableLeagues(activeLeagues);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setLoading(false);
    }
  }, [setAvailableLeagues]);

  useEffect(() => {
    fetchLeagues();
  }, [fetchLeagues]);

  // League CRUD
  const openCreateLeagueModal = () => {
    setEditingLeague(null);
    setLeagueForm({ name: "", description: "" });
    setLeagueFormError(null);
    setShowLeagueModal(true);
  };

  const openEditLeagueModal = (league: League) => {
    setEditingLeague(league);
    setLeagueForm({ name: league.name, description: league.description || "" });
    setLeagueFormError(null);
    setShowLeagueModal(true);
  };

  const handleLeagueSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingLeague(true);
    setLeagueFormError(null);

    const payload = {
      name: leagueForm.name,
      description: leagueForm.description || undefined,
    };

    try {
      const url = editingLeague
        ? `/api/admin/leagues/${editingLeague._id}`
        : "/api/admin/leagues";
      const method = editingLeague ? "PUT" : "POST";

      const res = await adminFetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const json = await res.json();
        throw new Error(json.message || "Failed to save league");
      }

      setShowLeagueModal(false);
      fetchLeagues();
    } catch (err) {
      setLeagueFormError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setSavingLeague(false);
    }
  };

  const handleDeactivate = async (league: League) => {
    if (!confirm(`Deactivate league "${league.name}"? Historical data will be preserved.`)) return;
    try {
      const res = await adminFetch(`/api/admin/leagues/${league._id}/deactivate`, {
        method: "PATCH",
      });
      if (!res.ok) throw new Error("Failed to deactivate league");
      fetchLeagues();
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    }
  };

  const handleReactivate = async (league: League) => {
    try {
      const res = await adminFetch(`/api/admin/leagues/${league._id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: true }),
      });
      if (!res.ok) throw new Error("Failed to reactivate league");
      fetchLeagues();
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    }
  };

  // League Admin assignment
  const openAssignModal = async () => {
    setShowAssignModal(true);
    setAssignError(null);
    setSelectedPersonId("");
    setSelectedLeagueIds([]);
    setLoadingPeople(true);
    try {
      const res = await adminFetch("/api/admin/people");
      if (res.ok) {
        const json = await res.json();
        setPeople(json.data || []);
      }
    } catch {
      // ignore
    } finally {
      setLoadingPeople(false);
    }
  };

  const handleLeagueToggle = (leagueId: string) => {
    setSelectedLeagueIds((prev) =>
      prev.includes(leagueId)
        ? prev.filter((id) => id !== leagueId)
        : [...prev, leagueId]
    );
  };

  const handleAssignSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPersonId) return;
    setAssigning(true);
    setAssignError(null);

    try {
      const res = await adminFetch(`/api/admin/people/${selectedPersonId}/league-admin`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ leagueIds: selectedLeagueIds }),
      });

      if (!res.ok) {
        const json = await res.json();
        throw new Error(json.message || "Failed to assign League Admin role");
      }

      setShowAssignModal(false);
    } catch (err) {
      setAssignError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setAssigning(false);
    }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Globe className="h-6 w-6 text-[var(--color-primary,#3b82f6)]" />
          <h1 className="text-2xl font-bold text-[var(--foreground)]">Leagues</h1>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={openAssignModal}
            className="flex items-center gap-2 rounded-md border border-[var(--border)] px-4 py-2 text-sm font-medium hover:bg-[var(--muted,#f3f4f6)] transition-colors"
          >
            <Shield className="h-4 w-4" />
            Assign League Admin
          </button>
          <button
            onClick={openCreateLeagueModal}
            className="flex items-center gap-2 rounded-md bg-[var(--color-primary,#3b82f6)] px-4 py-2 text-sm font-medium text-white hover:opacity-90 transition-opacity"
          >
            <Plus className="h-4 w-4" />
            Create League
          </button>
        </div>
      </div>

      {error && (
        <div className="mb-4 rounded-md bg-red-50 border border-red-200 p-3 text-sm text-red-700">
          {error}
          <button onClick={() => setError(null)} className="ml-2 font-medium underline">
            Dismiss
          </button>
        </div>
      )}

      {/* Leagues Table */}
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
                <th className="px-4 py-3 text-left font-medium">Description</th>
                <th className="px-4 py-3 text-left font-medium">Status</th>
                <th className="px-4 py-3 text-left font-medium">Created</th>
                <th className="px-4 py-3 text-right font-medium">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border)]">
              {leagues.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-[var(--muted-foreground,#6b7280)]">
                    No leagues found
                  </td>
                </tr>
              ) : (
                leagues.map((league) => (
                  <tr key={league._id} className="hover:bg-[var(--muted,#f3f4f6)]/50">
                    <td className="px-4 py-3 font-medium">{league.name}</td>
                    <td className="px-4 py-3 text-[var(--muted-foreground,#6b7280)] max-w-xs truncate">
                      {league.description || "—"}
                    </td>
                    <td className="px-4 py-3">
                      {league.isActive ? (
                        <span className="rounded-full bg-green-100 text-green-700 px-2 py-0.5 text-xs font-medium">
                          Active
                        </span>
                      ) : (
                        <span className="rounded-full bg-gray-100 text-gray-600 px-2 py-0.5 text-xs font-medium">
                          Inactive
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-[var(--muted-foreground,#6b7280)]">
                      {new Date(league.createdAt).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-2">
                        {league.isActive ? (
                          <button
                            onClick={() => handleDeactivate(league)}
                            className="rounded p-1 hover:bg-[var(--muted,#f3f4f6)] transition-colors text-yellow-600"
                            title="Deactivate"
                          >
                            <PowerOff className="h-4 w-4" />
                          </button>
                        ) : (
                          <button
                            onClick={() => handleReactivate(league)}
                            className="rounded p-1 hover:bg-[var(--muted,#f3f4f6)] transition-colors text-green-600"
                            title="Reactivate"
                          >
                            <Power className="h-4 w-4" />
                          </button>
                        )}
                        <button
                          onClick={() => openEditLeagueModal(league)}
                          className="rounded p-1 hover:bg-[var(--muted,#f3f4f6)] transition-colors"
                          title="Edit"
                        >
                          <Pencil className="h-4 w-4" />
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

      {/* Create/Edit League Modal */}
      {showLeagueModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="w-full max-w-lg rounded-lg bg-[var(--background)] p-6 shadow-xl">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold">
                {editingLeague ? "Edit League" : "Create League"}
              </h2>
              <button onClick={() => setShowLeagueModal(false)} className="rounded p-1 hover:bg-[var(--muted,#f3f4f6)]">
                <X className="h-5 w-5" />
              </button>
            </div>

            {leagueFormError && (
              <div className="mb-4 rounded-md bg-red-50 border border-red-200 p-3 text-sm text-red-700">
                {leagueFormError}
              </div>
            )}

            <form onSubmit={handleLeagueSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">League Name</label>
                <input
                  type="text"
                  required
                  value={leagueForm.name}
                  onChange={(e) => setLeagueForm((p) => ({ ...p, name: e.target.value }))}
                  className="w-full rounded-md border border-[var(--border)] px-3 py-2 text-sm"
                  placeholder="e.g., Kansas City Racing League"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Description</label>
                <textarea
                  value={leagueForm.description}
                  onChange={(e) => setLeagueForm((p) => ({ ...p, description: e.target.value }))}
                  className="w-full rounded-md border border-[var(--border)] px-3 py-2 text-sm"
                  rows={3}
                  placeholder="Optional description of the league..."
                />
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowLeagueModal(false)}
                  className="rounded-md border border-[var(--border)] px-4 py-2 text-sm font-medium hover:bg-[var(--muted,#f3f4f6)]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingLeague}
                  className="rounded-md bg-[var(--color-primary,#3b82f6)] px-4 py-2 text-sm font-medium text-white hover:opacity-90 disabled:opacity-50"
                >
                  {savingLeague ? "Saving..." : editingLeague ? "Update" : "Create"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Assign League Admin Modal */}
      {showAssignModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="w-full max-w-lg rounded-lg bg-[var(--background)] p-6 shadow-xl">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold">Assign League Admin</h2>
              <button onClick={() => setShowAssignModal(false)} className="rounded p-1 hover:bg-[var(--muted,#f3f4f6)]">
                <X className="h-5 w-5" />
              </button>
            </div>

            {assignError && (
              <div className="mb-4 rounded-md bg-red-50 border border-red-200 p-3 text-sm text-red-700">
                {assignError}
              </div>
            )}

            {loadingPeople ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-[var(--color-primary,#3b82f6)]" />
              </div>
            ) : (
              <form onSubmit={handleAssignSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Person</label>
                  <select
                    required
                    value={selectedPersonId}
                    onChange={(e) => setSelectedPersonId(e.target.value)}
                    className="w-full rounded-md border border-[var(--border)] px-3 py-2 text-sm"
                  >
                    <option value="">Select a person...</option>
                    {people.map((person) => (
                      <option key={person._id} value={person._id}>
                        {person.name.first} {person.name.last} ({person.email})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">Assign to Leagues</label>
                  <div className="space-y-2 max-h-48 overflow-y-auto rounded-md border border-[var(--border)] p-3">
                    {leagues.filter((l) => l.isActive).map((league) => (
                      <label
                        key={league._id}
                        className="flex items-center gap-2 rounded-md px-2 py-1.5 hover:bg-[var(--muted,#f3f4f6)] cursor-pointer"
                      >
                        <input
                          type="checkbox"
                          checked={selectedLeagueIds.includes(league._id)}
                          onChange={() => handleLeagueToggle(league._id)}
                          className="rounded"
                        />
                        <span className="text-sm">{league.name}</span>
                      </label>
                    ))}
                    {leagues.filter((l) => l.isActive).length === 0 && (
                      <p className="text-sm text-[var(--muted-foreground)]">No active leagues available</p>
                    )}
                  </div>
                </div>

                <div className="flex justify-end gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowAssignModal(false)}
                    className="rounded-md border border-[var(--border)] px-4 py-2 text-sm font-medium hover:bg-[var(--muted,#f3f4f6)]"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={assigning || !selectedPersonId || selectedLeagueIds.length === 0}
                    className="flex items-center gap-2 rounded-md bg-[var(--color-primary,#3b82f6)] px-4 py-2 text-sm font-medium text-white hover:opacity-90 disabled:opacity-50"
                  >
                    <UserPlus className="h-4 w-4" />
                    {assigning ? "Assigning..." : "Assign Role"}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
