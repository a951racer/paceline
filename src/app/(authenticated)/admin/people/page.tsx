"use client";

import React, { useEffect, useState, useCallback } from "react";
import { Users, Plus, Pencil, Trash2, X, Search, UserPlus, UserMinus } from "lucide-react";
import { useLeagueStore } from "@/hooks/use-league-store";
import { adminFetch } from "@/lib/admin-fetch";
import { useReferenceData } from "@/hooks/use-reference-data";

interface Person {
  _id: string;
  name: { first: string; last: string };
  email: string;
  phone?: string;
  roles?: string[];
  securityRoles: string[];
  personTypes: string[];
  category?: string;
  organizationIds: string[];
  leagueIds: string[];
  isRegistered: boolean;
  createdAt: string;
}

interface League {
  _id: string;
  name: string;
  isActive: boolean;
}

interface Enrollment {
  _id: string;
  entityId: string;
  entityType: string;
  leagueId: string;
  seasonId: string;
  isActive: boolean;
}

const SECURITY_ROLES = ["administrator", "super_administrator", "league_administrator"];

/**
 * Admin People Page - Shows enrollment status for active league-season.
 * Adds enrollment management controls (enroll/remove from league-season).
 *
 * Requirements: 3.7
 */
export default function AdminPeoplePage() {
  const [people, setPeople] = useState<Person[]>([]);
  const [enrollments, setEnrollments] = useState<Enrollment[]>([]);
  const [leagues, setLeagues] = useState<League[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [editingPerson, setEditingPerson] = useState<Person | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState("");
  const [enrollingId, setEnrollingId] = useState<string | null>(null);

  const activeLeagueId = useLeagueStore((state) => state.activeLeagueId);

  const { activeItems: personTypes, isLoading: personTypesLoading, resolveKey: resolvePersonType } = useReferenceData("person_type");
  const { activeItems: categoryItems, isLoading: categoriesLoading, resolveKey: resolveCategory } = useReferenceData("category");

  // Form state
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    securityRoles: [] as string[],
    personTypes: [] as string[],
    leagueIds: [] as string[],
    category: "",
  });
  const [formError, setFormError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const fetchPeople = useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (roleFilter) params.set("roles", roleFilter);
      if (searchQuery) params.set("name", searchQuery);
      const res = await adminFetch(`/api/admin/people?${params.toString()}`);
      if (!res.ok) throw new Error("Failed to fetch people");
      const json = await res.json();
      setPeople(json.data || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setLoading(false);
    }
  }, [roleFilter, searchQuery]);

  const fetchEnrollments = useCallback(async () => {
    if (!activeLeagueId) return;
    try {
      const res = await adminFetch("/api/admin/enrollments");
      if (res.ok) {
        const json = await res.json();
        setEnrollments(json.data || []);
      }
    } catch {
      // Silently fail - enrollments are supplementary data
    }
  }, [activeLeagueId]);

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
    fetchPeople();
    fetchLeagues();
  }, [fetchPeople, fetchLeagues]);

  useEffect(() => {
    fetchEnrollments();
  }, [fetchEnrollments]);

  const isPersonEnrolled = (personId: string): boolean => {
    return enrollments.some(
      (e) => e.entityId === personId && e.entityType === "person" && e.isActive
    );
  };

  const handleEnroll = async (personId: string) => {
    setEnrollingId(personId);
    try {
      const res = await adminFetch("/api/admin/enrollments/persons", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ personId, leagueId: activeLeagueId }),
      });
      if (!res.ok) {
        const json = await res.json();
        throw new Error(json.message || "Failed to enroll person");
      }
      fetchEnrollments();
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setEnrollingId(null);
    }
  };

  const handleRemoveEnrollment = async (personId: string) => {
    if (!confirm("Remove this person from the active league-season?")) return;
    setEnrollingId(personId);
    try {
      const res = await adminFetch(`/api/admin/enrollments/persons/${personId}`, { method: "DELETE" });
      if (!res.ok) {
        const json = await res.json();
        throw new Error(json.message || "Failed to remove enrollment");
      }
      fetchEnrollments();
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setEnrollingId(null);
    }
  };

  const openCreateModal = () => {
    setEditingPerson(null);
    setFormData({ firstName: "", lastName: "", email: "", phone: "", securityRoles: [], personTypes: [], leagueIds: activeLeagueId ? [activeLeagueId] : [], category: "" });
    setFormError(null);
    setShowModal(true);
  };

  const openEditModal = (person: Person) => {
    setEditingPerson(person);
    setFormData({
      firstName: person.name.first,
      lastName: person.name.last,
      email: person.email,
      phone: person.phone || "",
      securityRoles: [...(person.securityRoles || [])],
      personTypes: [...(person.personTypes || [])],
      leagueIds: [...(person.leagueIds || [])],
      category: person.category || "",
    });
    setFormError(null);
    setShowModal(true);
  };

  const handleSecurityRoleToggle = (role: string) => {
    setFormData((prev) => ({
      ...prev,
      securityRoles: prev.securityRoles.includes(role)
        ? prev.securityRoles.filter((r) => r !== role)
        : [...prev.securityRoles, role],
    }));
  };

  const handlePersonTypeToggle = (type: string) => {
    setFormData((prev) => ({
      ...prev,
      personTypes: prev.personTypes.includes(type)
        ? prev.personTypes.filter((t) => t !== type)
        : [...prev.personTypes, type],
    }));
  };

  const handleLeagueToggle = (leagueId: string) => {
    setFormData((prev) => ({
      ...prev,
      leagueIds: prev.leagueIds.includes(leagueId)
        ? prev.leagueIds.filter((id) => id !== leagueId)
        : [...prev.leagueIds, leagueId],
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setFormError(null);

    const payload = {
      name: { first: formData.firstName, last: formData.lastName },
      email: formData.email,
      phone: formData.phone || undefined,
      securityRoles: formData.securityRoles,
      personTypes: formData.personTypes,
      leagueIds: formData.leagueIds,
      category: formData.category || undefined,
    };

    try {
      const url = editingPerson
        ? `/api/admin/people/${editingPerson._id}`
        : "/api/admin/people";
      const method = editingPerson ? "PUT" : "POST";

      const res = await adminFetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const json = await res.json();
        throw new Error(json.message || "Failed to save person");
      }

      setShowModal(false);
      fetchPeople();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (person: Person) => {
    if (!confirm(`Delete ${person.name.first} ${person.name.last}?`)) return;
    try {
      const res = await adminFetch(`/api/admin/people/${person._id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete person");
      fetchPeople();
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Users className="h-6 w-6 text-[var(--color-primary,#3b82f6)]" />
          <h1 className="text-2xl font-bold text-[var(--foreground)]">People</h1>
        </div>
        <button
          onClick={openCreateModal}
          className="flex items-center gap-2 rounded-md bg-[var(--color-primary,#3b82f6)] px-4 py-2 text-sm font-medium text-white hover:opacity-90 transition-opacity"
        >
          <Plus className="h-4 w-4" />
          Add Person
        </button>
      </div>

      {/* Filters */}
      <div className="flex gap-3 mb-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--muted-foreground,#6b7280)]" />
          <input
            type="text"
            placeholder="Search by name..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full rounded-md border border-[var(--border)] bg-[var(--background)] pl-9 pr-3 py-2 text-sm"
          />
        </div>
        <select
          value={roleFilter}
          onChange={(e) => setRoleFilter(e.target.value)}
          className="rounded-md border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-sm"
        >
          <option value="">All Roles</option>
          <optgroup label="Security Roles">
            {SECURITY_ROLES.map((r) => (
              <option key={r} value={r}>{r.replace(/_/g, " ")}</option>
            ))}
          </optgroup>
          <optgroup label="Person Types">
            {personTypes.map((t) => (
              <option key={t.key} value={t.key}>{t.label}</option>
            ))}
          </optgroup>
        </select>
      </div>

      {/* Error */}
      {error && (
        <div className="mb-4 rounded-md bg-red-50 border border-red-200 p-3 text-sm text-red-700">
          {error}
          <button onClick={() => setError(null)} className="ml-2 font-medium underline">Dismiss</button>
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
                <th className="px-4 py-3 text-left font-medium">Email</th>
                <th className="px-4 py-3 text-left font-medium">Roles</th>
                <th className="px-4 py-3 text-left font-medium">Category</th>
                <th className="px-4 py-3 text-left font-medium">Enrollment</th>
                <th className="px-4 py-3 text-right font-medium">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border)]">
              {people.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-[var(--muted-foreground,#6b7280)]">
                    No people found
                  </td>
                </tr>
              ) : (
                people.map((person) => {
                  const enrolled = isPersonEnrolled(person._id);
                  return (
                    <tr key={person._id} className="hover:bg-[var(--muted,#f3f4f6)]/50">
                      <td className="px-4 py-3 font-medium">
                        {person.name.first} {person.name.last}
                      </td>
                      <td className="px-4 py-3 text-[var(--muted-foreground,#6b7280)]">
                        {person.email}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex flex-wrap gap-1">
                          {(person.securityRoles || []).map((role) => (
                            <span
                              key={role}
                              className="rounded-full bg-purple-100 px-2 py-0.5 text-xs font-medium text-purple-700"
                            >
                              {role.replace(/_/g, " ")}
                            </span>
                          ))}
                          {(person.personTypes || []).map((type) => (
                            <span
                              key={type}
                              className="rounded-full bg-[var(--color-primary,#3b82f6)]/10 px-2 py-0.5 text-xs font-medium text-[var(--color-primary,#3b82f6)]"
                            >
                              {resolvePersonType(type)}
                            </span>
                          ))}
                        </div>
                      </td>
                      <td className="px-4 py-3 capitalize">
                        {person.category ? resolveCategory(person.category) : "—"}
                      </td>
                      <td className="px-4 py-3">
                        {enrolled ? (
                          <span className="rounded-full bg-green-100 text-green-700 px-2 py-0.5 text-xs font-medium">
                            Enrolled
                          </span>
                        ) : (
                          <span className="rounded-full bg-gray-100 text-gray-500 px-2 py-0.5 text-xs font-medium">
                            Not Enrolled
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-2">
                          {enrolled ? (
                            <button
                              onClick={() => handleRemoveEnrollment(person._id)}
                              disabled={enrollingId === person._id}
                              className="rounded p-1 hover:bg-red-50 text-red-600 transition-colors disabled:opacity-50"
                              title="Remove from league-season"
                            >
                              <UserMinus className="h-4 w-4" />
                            </button>
                          ) : (
                            <button
                              onClick={() => handleEnroll(person._id)}
                              disabled={enrollingId === person._id}
                              className="rounded p-1 hover:bg-green-50 text-green-600 transition-colors disabled:opacity-50"
                              title="Enroll in league-season"
                            >
                              <UserPlus className="h-4 w-4" />
                            </button>
                          )}
                          <button
                            onClick={() => openEditModal(person)}
                            className="rounded p-1 hover:bg-[var(--muted,#f3f4f6)] transition-colors"
                            title="Edit"
                          >
                            <Pencil className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => handleDelete(person)}
                            className="rounded p-1 hover:bg-red-50 text-red-600 transition-colors"
                            title="Delete"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
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
                {editingPerson ? "Edit Person" : "Add Person"}
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
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium mb-1">First Name</label>
                  <input
                    type="text"
                    required
                    value={formData.firstName}
                    onChange={(e) => setFormData((p) => ({ ...p, firstName: e.target.value }))}
                    className="w-full rounded-md border border-[var(--border)] px-3 py-2 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Last Name</label>
                  <input
                    type="text"
                    required
                    value={formData.lastName}
                    onChange={(e) => setFormData((p) => ({ ...p, lastName: e.target.value }))}
                    className="w-full rounded-md border border-[var(--border)] px-3 py-2 text-sm"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Email</label>
                <input
                  type="email"
                  required
                  value={formData.email}
                  onChange={(e) => setFormData((p) => ({ ...p, email: e.target.value }))}
                  className="w-full rounded-md border border-[var(--border)] px-3 py-2 text-sm"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Phone</label>
                <input
                  type="text"
                  value={formData.phone}
                  onChange={(e) => setFormData((p) => ({ ...p, phone: e.target.value }))}
                  className="w-full rounded-md border border-[var(--border)] px-3 py-2 text-sm"
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

              <div>
                <label className="block text-sm font-medium mb-1">Category</label>
                <select
                  value={formData.category}
                  onChange={(e) => setFormData((p) => ({ ...p, category: e.target.value }))}
                  className="w-full rounded-md border border-[var(--border)] px-3 py-2 text-sm"
                  disabled={categoriesLoading}
                >
                  <option value="">None</option>
                  {categoriesLoading ? (
                    <option value="" disabled>Loading...</option>
                  ) : (
                    categoryItems.map((c) => (
                      <option key={c.key} value={c.key}>{c.label}</option>
                    ))
                  )}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Person Types</label>
                {personTypesLoading ? (
                  <p className="text-sm text-[var(--muted-foreground,#6b7280)]">Loading person types...</p>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {personTypes.map((type) => (
                      <label
                        key={type.key}
                        className="flex items-center gap-1.5 rounded-md border border-[var(--border)] px-3 py-1.5 text-sm cursor-pointer hover:bg-[var(--muted,#f3f4f6)]"
                      >
                        <input
                          type="checkbox"
                          checked={formData.personTypes.includes(type.key)}
                          onChange={() => handlePersonTypeToggle(type.key)}
                          className="rounded"
                        />
                        <span>{type.label}</span>
                      </label>
                    ))}
                  </div>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Security Roles</label>
                <div className="flex flex-wrap gap-2">
                  {SECURITY_ROLES.map((role) => (
                    <label
                      key={role}
                      className="flex items-center gap-1.5 rounded-md border border-[var(--border)] px-3 py-1.5 text-sm cursor-pointer hover:bg-[var(--muted,#f3f4f6)]"
                    >
                      <input
                        type="checkbox"
                        checked={formData.securityRoles.includes(role)}
                        onChange={() => handleSecurityRoleToggle(role)}
                        className="rounded"
                      />
                      <span className="capitalize">{role.replace(/_/g, " ")}</span>
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
                  {saving ? "Saving..." : editingPerson ? "Update" : "Create"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
