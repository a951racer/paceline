"use client";

import React, { useEffect, useState, useCallback } from "react";
import { Medal, Plus, Pencil, Trash2, X, CheckCircle2, XCircle } from "lucide-react";

interface Award {
  _id: string;
  name: string;
  description: string;
  badgeUrl: string;
  nominationType: string;
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

  // Form state
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    badgeUrl: "",
    nominationType: "admin_assigned",
  });
  const [formError, setFormError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const fetchAwards = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/admin/awards");
      if (!res.ok) throw new Error("Failed to fetch awards");
      const json = await res.json();
      setAwards(json.data || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchNominations = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/admin/nominations?status=pending");
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

  const openCreateModal = () => {
    setEditingAward(null);
    setFormData({ name: "", description: "", badgeUrl: "", nominationType: "admin_assigned" });
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
      badgeUrl: formData.badgeUrl,
      nominationType: formData.nominationType,
    };

    try {
      const url = editingAward ? `/api/admin/awards/${editingAward._id}` : "/api/admin/awards";
      const method = editingAward ? "PUT" : "POST";

      const res = await fetch(url, {
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
      const res = await fetch(`/api/admin/awards/${award._id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete award");
      fetchAwards();
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    }
  };

  const handleNominationAction = async (nominationId: string, action: "approve" | "reject") => {
    try {
      const res = await fetch(`/api/admin/nominations/${nominationId}`, {
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
              {awards.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-[var(--muted-foreground,#6b7280)]">
                    No awards found
                  </td>
                </tr>
              ) : (
                awards.map((award) => (
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
                  required
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
