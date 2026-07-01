"use client";

import React, { useEffect, useState, useCallback, useMemo } from "react";
import { Medal, Plus, Pencil, Trash2, X, CheckCircle2, XCircle } from "lucide-react";
import { adminFetch } from "@/lib/admin-fetch";
import { useLeagueStore } from "@/hooks/use-league-store";
import { useSeasonStore } from "@/hooks/use-season-store";
import { useUserStore } from "@/hooks/use-user-store";

interface Award {
  _id: string;
  name: string;
  description: string;
  badgeUrl: string;
  nominationType: string;
  leagueId?: string;
  seasonId?: string;
  createdAt: string;
}

interface Nomination {
  _id: string;
  nominatorId: { _id: string; name: { first: string; last: string }; email: string } | string;
  nomineeId: { _id: string; name: { first: string; last: string }; email: string } | string;
  awardId: { _id: string; name: string } | string;
  reason?: string;
  status: string;
  createdAt: string;
}

type TabType = "awards" | "nominations";

export default function AdminAwardsPage() {
  const [activeTab, setActiveTab] = useState<TabType>("awards");
  const [awards, setAwards] = useState<Award[]>([]);
  const [nominations, setNominations] = useState<Nomination[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [editingAward, setEditingAward] = useState<Award | null>(null);
  const [leagueFilterMode, setLeagueFilterMode] = useState<"all" | "current" | "unassociated">("current");

  const activeLeagueId = useLeagueStore((state) => state.activeLeagueId);
  const availableLeagues = useLeagueStore((state) => state.availableLeagues);
  const activeSeasonId = useSeasonStore((state) => state.activeSeasonId);
  const isSuperAdmin = useUserStore((state) => state.isSuperAdmin);

  // Form state
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    badgeUrl: "",
    nominationType: "admin_assigned",
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

  const fetchAwards = useCallback(async () => {
    try {
      setLoading(true);
      // For super admin "all" mode, fetch without league scoping
      let res;
      if (isSuperAdmin && leagueFilterMode === "all") {
        res = await fetch("/api/admin/awards", {
          headers: { Authorization: `Bearer ${localStorage.getItem("accessToken")}` },
        });
      } else {
        const params = new URLSearchParams();
        if (activeLeagueId) params.set("leagueId", activeLeagueId);
        if (activeSeasonId) params.set("seasonId", activeSeasonId);
        res = await fetch(`/api/admin/awards?${params.toString()}`, {
          headers: { Authorization: `Bearer ${localStorage.getItem("accessToken")}` },
        });
      }
      if (!res.ok) throw new Error("Failed to fetch awards");
      const json = await res.json();
      setAwards(json.data || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setLoading(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeLeagueId, activeSeasonId, leagueFilterMode, isSuperAdmin]);

  const fetchNominations = useCallback(async () => {
    try {
      setLoading(true);
      const res = await adminFetch("/api/admin/nominations?status=pending");
      if (!res.ok) throw new Error("Failed to fetch nominations");
      const json = await res.json();
      setNominations(json.data || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (activeTab === "awards") {
      fetchAwards();
    } else {
      fetchNominations();
    }
  }, [activeTab, fetchAwards, fetchNominations]);

  // For "unassociated" mode, filter client-side
  const filteredAwards = useMemo(() => {
    if (isSuperAdmin && leagueFilterMode === "unassociated") {
      return awards.filter((a) => !a.leagueId);
    }
    return awards;
  }, [awards, isSuperAdmin, leagueFilterMode]);

  const openCreateModal = () => {
    setEditingAward(null);
    setFormData({ name: "", description: "", badgeUrl: "", nominationType: "admin_assigned", leagueId: activeLeagueId || "", seasonId: activeSeasonId || "" });
    setFormError(null);
    setShowModal(true);
  };

  const openEditModal = (award: Award) => {
    setEditingAward(award);
    setFormData({
      name: award.name,
      description: award.description,
      badgeUrl: award.badgeUrl || "",
      nominationType: award.nominationType,
      leagueId: award.leagueId || "",
      seasonId: award.seasonId || "",
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
      badgeUrl: formData.badgeUrl || undefined,
      nominationType: formData.nominationType,
      leagueId: formData.leagueId,
      seasonId: formData.seasonId,
    };

    try {
      const url = editingAward ? `/api/admin/awards/${editingAward._id}` : "/api/admin/awards";
      const method = editingAward ? "PUT" : "POST";

      const res = await adminFetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const json = await res.json();
        throw new Error(json.message || "Failed to save award");
      }

      setShowModal(false);
      fetchAwards();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (award: Award) => {
    if (!confirm(`Delete award "${award.name}"?`)) return;
    try {
      const res = await adminFetch(`/api/admin/awards/${award._id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete award");
      fetchAwards();
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    }
  };

  const handleNominationAction = async (nominationId: string, action: "approve" | "reject") => {
    try {
      const res = await adminFetch(`/api/admin/nominations/${nominationId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      if (!res.ok) {
        const json = await res.json();
        throw new Error(json.message || `Failed to ${action} nomination`);
      }
      fetchNominations();
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    }
  };

  const getPersonName = (person: Nomination["nominatorId"]) => {
    if (typeof person === "string") return person;
    return `${person.name.first} ${person.name.last}`;
  };

  const getAwardName = (award: Nomination["awardId"]) => {
    if (typeof award === "string") return award;
    return award.name;
  };

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Medal className="h-6 w-6 text-[var(--color-primary,#3b82f6)]" />
          <h1 className="text-2xl font-bold text-[var(--foreground)]">Awards & Nominations</h1>
        </div>
        {activeTab === "awards" && (
          <button
            onClick={openCreateModal}
            className="flex items-center gap-2 rounded-md bg-[var(--color-primary,#3b82f6)] px-4 py-2 text-sm font-medium text-white hover:opacity-90 transition-opacity"
          >
            <Plus className="h-4 w-4" />
            Add Award
          </button>
        )}
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

      {/* Tabs */}
      <div className="flex gap-1 mb-4 border-b border-[var(--border)]">
        <button
          onClick={() => setActiveTab("awards")}
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
            activeTab === "awards"
              ? "border-[var(--color-primary,#3b82f6)] text-[var(--color-primary,#3b82f6)]"
              : "border-transparent text-[var(--muted-foreground,#6b7280)] hover:text-[var(--foreground)]"
          }`}
        >
          Awards
        </button>
        <button
          onClick={() => setActiveTab("nominations")}
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
            activeTab === "nominations"
              ? "border-[var(--color-primary,#3b82f6)] text-[var(--color-primary,#3b82f6)]"
              : "border-transparent text-[var(--muted-foreground,#6b7280)] hover:text-[var(--foreground)]"
          }`}
        >
          Pending Nominations
        </button>
      </div>

      {error && (
        <div className="mb-4 rounded-md bg-red-50 border border-red-200 p-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-[var(--color-primary,#3b82f6)] border-t-transparent" />
        </div>
      ) : activeTab === "awards" ? (
        /* Awards Table */
        <div className="overflow-x-auto rounded-lg border border-[var(--border)]">
          <table className="w-full text-sm">
            <thead className="bg-[var(--muted,#f3f4f6)]">
              <tr>
                <th className="px-4 py-3 text-left font-medium">Badge</th>
                <th className="px-4 py-3 text-left font-medium">Name</th>
                <th className="px-4 py-3 text-left font-medium">Type</th>
                <th className="px-4 py-3 text-left font-medium">Description</th>
                <th className="px-4 py-3 text-right font-medium">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border)]">
              {filteredAwards.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-[var(--muted-foreground,#6b7280)]">
                    No awards found
                  </td>
                </tr>
              ) : (
                filteredAwards.map((award) => (
                  <tr key={award._id} className="hover:bg-[var(--muted,#f3f4f6)]/50">
                    <td className="px-4 py-3">
                      {award.badgeUrl ? (
                        <img src={award.badgeUrl} alt="" className="h-8 w-8 rounded object-cover" />
                      ) : (
                        <div className="h-8 w-8 rounded bg-gray-200 flex items-center justify-center">
                          <Medal className="h-4 w-4 text-gray-400" />
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3 font-medium">{award.name}</td>
                    <td className="px-4 py-3">
                      <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                        award.nominationType === "peer_nominated"
                          ? "bg-purple-100 text-purple-700"
                          : "bg-blue-100 text-blue-700"
                      }`}>
                        {award.nominationType?.replace("_", " ") || "admin assigned"}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-[var(--muted-foreground,#6b7280)] max-w-xs truncate">
                      {award.description}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => openEditModal(award)}
                          className="rounded p-1 hover:bg-[var(--muted,#f3f4f6)] transition-colors"
                          title="Edit"
                        >
                          <Pencil className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(award)}
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
      ) : (
        /* Nominations Table */
        <div className="overflow-x-auto rounded-lg border border-[var(--border)]">
          <table className="w-full text-sm">
            <thead className="bg-[var(--muted,#f3f4f6)]">
              <tr>
                <th className="px-4 py-3 text-left font-medium">Nominator</th>
                <th className="px-4 py-3 text-left font-medium">Nominee</th>
                <th className="px-4 py-3 text-left font-medium">Award</th>
                <th className="px-4 py-3 text-left font-medium">Reason</th>
                <th className="px-4 py-3 text-right font-medium">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border)]">
              {nominations.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-[var(--muted-foreground,#6b7280)]">
                    No pending nominations
                  </td>
                </tr>
              ) : (
                nominations.map((nom) => (
                  <tr key={nom._id} className="hover:bg-[var(--muted,#f3f4f6)]/50">
                    <td className="px-4 py-3">{getPersonName(nom.nominatorId)}</td>
                    <td className="px-4 py-3 font-medium">{getPersonName(nom.nomineeId)}</td>
                    <td className="px-4 py-3">{getAwardName(nom.awardId)}</td>
                    <td className="px-4 py-3 text-[var(--muted-foreground,#6b7280)] max-w-xs truncate">
                      {nom.reason || "—"}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => handleNominationAction(nom._id, "approve")}
                          className="rounded p-1 hover:bg-green-50 text-green-600 transition-colors"
                          title="Approve"
                        >
                          <CheckCircle2 className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleNominationAction(nom._id, "reject")}
                          className="rounded p-1 hover:bg-red-50 text-red-600 transition-colors"
                          title="Reject"
                        >
                          <XCircle className="h-4 w-4" />
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

      {/* Create/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="w-full max-w-lg rounded-lg bg-[var(--background)] p-6 shadow-xl">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold">
                {editingAward ? "Edit Award" : "Add Award"}
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
                <label className="block text-sm font-medium mb-1">Nomination Type</label>
                <select
                  value={formData.nominationType}
                  onChange={(e) => setFormData((p) => ({ ...p, nominationType: e.target.value }))}
                  className="w-full rounded-md border border-[var(--border)] px-3 py-2 text-sm"
                >
                  <option value="admin_assigned">Admin Assigned</option>
                  <option value="peer_nominated">Peer Nominated</option>
                </select>
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
                  {saving ? "Saving..." : editingAward ? "Update" : "Create"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
