"use client";

import React, { useEffect, useState, useCallback, useMemo } from "react";
import { Building2, Plus, Pencil, Trash2, X, Search, UserPlus, UserMinus } from "lucide-react";
import { adminFetch } from "@/lib/admin-fetch";
import { useReferenceData } from "@/hooks/use-reference-data";
import { useLeagueStore } from "@/hooks/use-league-store";
import { useUserStore } from "@/hooks/use-user-store";

interface Organization {
  _id: string;
  name: string;
  type: string;
  description?: string;
  memberIds: string[];
  leagueIds: string[];
  createdAt: string;
}

interface Person {
  _id: string;
  name: { first: string; last: string };
  email: string;
}

export default function AdminOrganizationsPage() {
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [editingOrg, setEditingOrg] = useState<Organization | null>(null);
  const [typeFilter, setTypeFilter] = useState("");
  const [leagueFilterMode, setLeagueFilterMode] = useState<"all" | "current" | "unassociated">("current");

  const activeLeagueId = useLeagueStore((state) => state.activeLeagueId);
  const isSuperAdmin = useUserStore((state) => state.isSuperAdmin);

  // Reference data for organization types
  const { activeItems: orgTypes, isLoading: orgTypesLoading, resolveKey: resolveOrgType } = useReferenceData("organization_type");

  // Member management
  const [managingMembers, setManagingMembers] = useState<Organization | null>(null);
  const [people, setPeople] = useState<Person[]>([]);
  const [memberSearch, setMemberSearch] = useState("");
  const [loadingPeople, setLoadingPeople] = useState(false);

  // Form state
  const [formData, setFormData] = useState({ name: "", type: "team", description: "", leagueIds: [] as string[] });
  const [formError, setFormError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [leagues, setLeagues] = useState<{ _id: string; name: string; isActive: boolean }[]>([]);

  const fetchOrganizations = useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (typeFilter) params.set("type", typeFilter);
      const res = await adminFetch(`/api/admin/organizations?${params.toString()}`);
      if (!res.ok) throw new Error("Failed to fetch organizations");
      const json = await res.json();
      setOrganizations(json.data || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setLoading(false);
    }
  }, [typeFilter]);

  const fetchLeagues = useCallback(async () => {
    try {
      const res = await adminFetch("/api/admin/leagues");
      if (res.ok) {
        const json = await res.json();
        setLeagues(json.data || []);
      }
    } catch {
      // Non-critical
    }
  }, []);

  useEffect(() => {
    fetchOrganizations();
    fetchLeagues();
  }, [fetchOrganizations, fetchLeagues]);

  // Filter organizations based on league toggle
  const filteredOrganizations = useMemo(() => {
    if (isSuperAdmin) {
      if (leagueFilterMode === "all") return organizations;
      if (leagueFilterMode === "unassociated") {
        return organizations.filter((o) => !o.leagueIds || o.leagueIds.length === 0);
      }
      // "current" mode
      if (!activeLeagueId) return organizations;
      return organizations.filter((o) => o.leagueIds && o.leagueIds.includes(activeLeagueId));
    }
    // League admins: only show orgs in the current league
    if (!activeLeagueId) return organizations;
    return organizations.filter((o) => o.leagueIds && o.leagueIds.includes(activeLeagueId));
  }, [organizations, isSuperAdmin, leagueFilterMode, activeLeagueId]);

  const fetchPeople = async (search: string) => {
    try {
      setLoadingPeople(true);
      const params = new URLSearchParams();
      if (search) params.set("name", search);
      const res = await adminFetch(`/api/admin/people?${params.toString()}`);
      if (!res.ok) return;
      const json = await res.json();
      setPeople(json.data || []);
    } catch {
      // silent
    } finally {
      setLoadingPeople(false);
    }
  };

  const openCreateModal = () => {
    setEditingOrg(null);
    setFormData({ name: "", type: orgTypes.length > 0 ? orgTypes[0].key : "", description: "", leagueIds: activeLeagueId ? [activeLeagueId] : [] });
    setFormError(null);
    setShowModal(true);
  };

  const openEditModal = (org: Organization) => {
    setEditingOrg(org);
    setFormData({ name: org.name, type: org.type, description: org.description || "", leagueIds: [...(org.leagueIds || [])] });
    setFormError(null);
    setShowModal(true);
  };

  const handleLeagueToggle = (leagueId: string) => {
    setFormData((prev) => ({
      ...prev,
      leagueIds: prev.leagueIds.includes(leagueId)
        ? prev.leagueIds.filter((id) => id !== leagueId)
        : [...prev.leagueIds, leagueId],
    }));
  };  const openMembersPanel = (org: Organization) => {
    setManagingMembers(org);
    setMemberSearch("");
    fetchPeople("");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setFormError(null);

    const payload = {
      name: formData.name,
      type: formData.type,
      description: formData.description || undefined,
      leagueIds: formData.leagueIds,
    };

    try {
      const url = editingOrg
        ? `/api/admin/organizations/${editingOrg._id}`
        : "/api/admin/organizations";
      const method = editingOrg ? "PUT" : "POST";

      const res = await adminFetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const json = await res.json();
        throw new Error(json.message || "Failed to save organization");
      }

      setShowModal(false);
      fetchOrganizations();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (org: Organization) => {
    if (!confirm(`Delete organization "${org.name}"?`)) return;
    try {
      const res = await adminFetch(`/api/admin/organizations/${org._id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete organization");
      fetchOrganizations();
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    }
  };

  const handleAddMember = async (personId: string) => {
    if (!managingMembers) return;
    try {
      const res = await adminFetch(`/api/admin/organizations/${managingMembers._id}/members`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ personId }),
      });
      if (!res.ok) {
        const json = await res.json();
        throw new Error(json.message || "Failed to add member");
      }
      fetchOrganizations();
      // Update local state
      setManagingMembers((prev) =>
        prev ? { ...prev, memberIds: [...prev.memberIds, personId] } : null
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    }
  };

  const handleRemoveMember = async (personId: string) => {
    if (!managingMembers) return;
    try {
      const res = await adminFetch(`/api/admin/organizations/${managingMembers._id}/members`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ personId }),
      });
      if (!res.ok) {
        const json = await res.json();
        throw new Error(json.message || "Failed to remove member");
      }
      fetchOrganizations();
      setManagingMembers((prev) =>
        prev ? { ...prev, memberIds: prev.memberIds.filter((id) => id !== personId) } : null
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Building2 className="h-6 w-6 text-[var(--color-primary,#3b82f6)]" />
          <h1 className="text-2xl font-bold text-[var(--foreground)]">Organizations</h1>
        </div>
        <button
          onClick={openCreateModal}
          className="flex items-center gap-2 rounded-md bg-[var(--color-primary,#3b82f6)] px-4 py-2 text-sm font-medium text-white hover:opacity-90 transition-opacity"
        >
          <Plus className="h-4 w-4" />
          Add Organization
        </button>
      </div>

      {/* Filters */}
      <div className="flex gap-3 mb-4">
        <select
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value)}
          className="rounded-md border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-sm"
          disabled={orgTypesLoading}
        >
          <option value="">All Types</option>
          {orgTypes.map((t) => (
            <option key={t.key} value={t.key}>{t.label}</option>
          ))}
        </select>
        {isSuperAdmin && (
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
        )}
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
                <th className="px-4 py-3 text-left font-medium">Members</th>
                <th className="px-4 py-3 text-right font-medium">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border)]">
              {filteredOrganizations.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-4 py-8 text-center text-[var(--muted-foreground,#6b7280)]">
                    No organizations found
                  </td>
                </tr>
              ) : (
                filteredOrganizations.map((org) => (
                  <tr key={org._id} className="hover:bg-[var(--muted,#f3f4f6)]/50">
                    <td className="px-4 py-3 font-medium">{org.name}</td>
                    <td className="px-4 py-3 capitalize">{resolveOrgType(org.type)}</td>
                    <td className="px-4 py-3">{org.memberIds?.length || 0} members</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => openMembersPanel(org)}
                          className="rounded p-1 hover:bg-[var(--muted,#f3f4f6)] transition-colors"
                          title="Manage Members"
                        >
                          <UserPlus className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => openEditModal(org)}
                          className="rounded p-1 hover:bg-[var(--muted,#f3f4f6)] transition-colors"
                          title="Edit"
                        >
                          <Pencil className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(org)}
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

      {/* Create/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="w-full max-w-lg rounded-lg bg-[var(--background)] p-6 shadow-xl">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold">
                {editingOrg ? "Edit Organization" : "Add Organization"}
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
                <label className="block text-sm font-medium mb-1">Type</label>
                <select
                  value={formData.type}
                  onChange={(e) => setFormData((p) => ({ ...p, type: e.target.value }))}
                  className="w-full rounded-md border border-[var(--border)] px-3 py-2 text-sm"
                  disabled={orgTypesLoading}
                >
                  {orgTypesLoading ? (
                    <option value="">Loading...</option>
                  ) : (
                    orgTypes.map((t) => (
                      <option key={t.key} value={t.key}>{t.label}</option>
                    ))
                  )}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Description</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData((p) => ({ ...p, description: e.target.value }))}
                  className="w-full rounded-md border border-[var(--border)] px-3 py-2 text-sm"
                  rows={3}
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Leagues</label>
                <div className="flex flex-wrap gap-2">
                  {leagues.filter((l) => l.isActive).map((league) => (
                    <label
                      key={league._id}
                      className="flex items-center gap-1.5 rounded-md border border-[var(--border)] px-3 py-1.5 text-sm cursor-pointer hover:bg-[var(--muted,#f3f4f6)]"
                    >
                      <input
                        type="checkbox"
                        checked={formData.leagueIds.includes(league._id)}
                        onChange={() => handleLeagueToggle(league._id)}
                        className="rounded"
                      />
                      <span>{league.name}</span>
                    </label>
                  ))}
                  {leagues.filter((l) => l.isActive).length === 0 && (
                    <p className="text-sm text-[var(--muted-foreground,#6b7280)]">No leagues available</p>
                  )}
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
                  {saving ? "Saving..." : editingOrg ? "Update" : "Create"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Members Panel */}
      {managingMembers && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="w-full max-w-lg rounded-lg bg-[var(--background)] p-6 shadow-xl max-h-[80vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold">
                Members — {managingMembers.name}
              </h2>
              <button onClick={() => setManagingMembers(null)} className="rounded p-1 hover:bg-[var(--muted,#f3f4f6)]">
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Current Members */}
            <div className="mb-4">
              <h3 className="text-sm font-medium mb-2">Current Members ({managingMembers.memberIds.length})</h3>
              {managingMembers.memberIds.length === 0 ? (
                <p className="text-sm text-[var(--muted-foreground,#6b7280)]">No members yet</p>
              ) : (
                <div className="space-y-1">
                  {managingMembers.memberIds.map((id) => (
                    <div key={id} className="flex items-center justify-between rounded-md border border-[var(--border)] px-3 py-2">
                      <span className="text-sm">{id}</span>
                      <button
                        onClick={() => handleRemoveMember(id)}
                        className="rounded p-1 hover:bg-red-50 text-red-600"
                        title="Remove"
                      >
                        <UserMinus className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Search to add */}
            <div>
              <h3 className="text-sm font-medium mb-2">Add Member</h3>
              <div className="relative mb-2">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--muted-foreground,#6b7280)]" />
                <input
                  type="text"
                  placeholder="Search people..."
                  value={memberSearch}
                  onChange={(e) => {
                    setMemberSearch(e.target.value);
                    fetchPeople(e.target.value);
                  }}
                  className="w-full rounded-md border border-[var(--border)] pl-9 pr-3 py-2 text-sm"
                />
              </div>
              {loadingPeople ? (
                <p className="text-sm text-[var(--muted-foreground,#6b7280)]">Searching...</p>
              ) : (
                <div className="space-y-1 max-h-40 overflow-y-auto">
                  {people
                    .filter((p) => !managingMembers.memberIds.includes(p._id))
                    .slice(0, 10)
                    .map((person) => (
                      <div key={person._id} className="flex items-center justify-between rounded-md border border-[var(--border)] px-3 py-2">
                        <span className="text-sm">{person.name.first} {person.name.last}</span>
                        <button
                          onClick={() => handleAddMember(person._id)}
                          className="rounded p-1 hover:bg-green-50 text-green-600"
                          title="Add"
                        >
                          <UserPlus className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
