"use client";

import React, { useEffect, useState, useCallback } from "react";
import {
  Users,
  UserPlus,
  UserMinus,
  Building2,
  Search,
  Loader2,
  X,
} from "lucide-react";
import { useLeagueStore } from "@/hooks/use-league-store";
import { adminFetch } from "@/lib/admin-fetch";

interface Enrollment {
  _id: string;
  entityType: "person" | "organization";
  entityId: string;
  leagueId: string;
  seasonId: string;
  enrolledAt: string;
  isActive: boolean;
  entityName?: string;
}

interface Person {
  _id: string;
  name: { first: string; last: string };
  email: string;
}

interface Organization {
  _id: string;
  name: string;
}

/**
 * Enrollment Management Page
 *
 * Admin component for managing enrollments in the active league-season.
 * Enroll/remove persons and organizations from active league-season.
 * Display current enrollment status.
 *
 * Requirements: 3.1, 3.4, 4.1, 4.4
 */
export default function EnrollmentManagementPage() {
  const [enrollments, setEnrollments] = useState<Enrollment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"persons" | "organizations">("persons");
  const [showEnrollModal, setShowEnrollModal] = useState(false);
  const [enrollType, setEnrollType] = useState<"person" | "organization">("person");

  // Enroll modal state
  const [availablePersons, setAvailablePersons] = useState<Person[]>([]);
  const [availableOrgs, setAvailableOrgs] = useState<Organization[]>([]);
  const [loadingAvailable, setLoadingAvailable] = useState(false);
  const [selectedEntityId, setSelectedEntityId] = useState("");
  const [enrolling, setEnrolling] = useState(false);
  const [enrollError, setEnrollError] = useState<string | null>(null);
  const [removingId, setRemovingId] = useState<string | null>(null);

  const activeLeagueId = useLeagueStore((state) => state.activeLeagueId);
  const activeLeagueName = useLeagueStore((state) => state.activeLeagueName);

  const fetchEnrollments = useCallback(async () => {
    if (!activeLeagueId) return;
    try {
      setLoading(true);
      const res = await adminFetch("/api/admin/enrollments");
      if (!res.ok) throw new Error("Failed to fetch enrollments");
      const json = await res.json();
      setEnrollments(json.data || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setLoading(false);
    }
  }, [activeLeagueId]);

  useEffect(() => {
    fetchEnrollments();
  }, [fetchEnrollments]);

  const personEnrollments = enrollments.filter((e) => e.entityType === "person" && e.isActive);
  const orgEnrollments = enrollments.filter((e) => e.entityType === "organization" && e.isActive);

  const openEnrollModal = async (type: "person" | "organization") => {
    setEnrollType(type);
    setSelectedEntityId("");
    setEnrollError(null);
    setShowEnrollModal(true);
    setLoadingAvailable(true);

    try {
      if (type === "person") {
        const res = await adminFetch("/api/admin/people");
        if (res.ok) {
          const json = await res.json();
          setAvailablePersons(json.data || []);
        }
      } else {
        const res = await adminFetch("/api/admin/organizations");
        if (res.ok) {
          const json = await res.json();
          setAvailableOrgs(json.data || []);
        }
      }
    } catch {
      // ignore
    } finally {
      setLoadingAvailable(false);
    }
  };

  const handleEnroll = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedEntityId || !activeLeagueId) return;
    setEnrolling(true);
    setEnrollError(null);

    try {
      const endpoint =
        enrollType === "person"
          ? "/api/admin/enrollments/persons"
          : "/api/admin/enrollments/organizations";
      const body =
        enrollType === "person"
          ? { personId: selectedEntityId, leagueId: activeLeagueId }
          : { organizationId: selectedEntityId, leagueId: activeLeagueId };

      const res = await adminFetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const json = await res.json();
        throw new Error(json.message || "Failed to enroll");
      }

      setShowEnrollModal(false);
      fetchEnrollments();
    } catch (err) {
      setEnrollError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setEnrolling(false);
    }
  };

  const handleRemove = async (enrollment: Enrollment) => {
    const entityLabel = enrollment.entityType === "person" ? "person" : "organization";
    if (!confirm(`Remove this ${entityLabel} from the active league-season?`)) return;

    setRemovingId(enrollment.entityId);
    try {
      const endpoint =
        enrollment.entityType === "person"
          ? `/api/admin/enrollments/persons/${enrollment.entityId}`
          : `/api/admin/enrollments/organizations/${enrollment.entityId}`;
      const res = await adminFetch(endpoint, { method: "DELETE" });

      if (!res.ok) {
        const json = await res.json();
        throw new Error(json.message || "Failed to remove enrollment");
      }

      fetchEnrollments();
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setRemovingId(null);
    }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Users className="h-6 w-6 text-[var(--color-primary,#3b82f6)]" />
          <div>
            <h1 className="text-2xl font-bold text-[var(--foreground)]">Enrollments</h1>
            {activeLeagueName && (
              <p className="text-sm text-[var(--muted-foreground,#6b7280)]">
                Managing enrollments for {activeLeagueName}
              </p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => openEnrollModal("person")}
            className="flex items-center gap-2 rounded-md bg-[var(--color-primary,#3b82f6)] px-4 py-2 text-sm font-medium text-white hover:opacity-90 transition-opacity"
          >
            <UserPlus className="h-4 w-4" />
            Enroll Person
          </button>
          <button
            onClick={() => openEnrollModal("organization")}
            className="flex items-center gap-2 rounded-md border border-[var(--border)] px-4 py-2 text-sm font-medium hover:bg-[var(--muted,#f3f4f6)] transition-colors"
          >
            <Building2 className="h-4 w-4" />
            Enroll Organization
          </button>
        </div>
      </div>

      {error && (
        <div className="mb-4 rounded-md bg-red-50 border border-red-200 p-3 text-sm text-red-700">
          {error}
          <button onClick={() => setError(null)} className="ml-2 font-medium underline">Dismiss</button>
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-1 mb-4 border-b border-[var(--border)]">
        <button
          onClick={() => setActiveTab("persons")}
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
            activeTab === "persons"
              ? "border-[var(--color-primary,#3b82f6)] text-[var(--color-primary,#3b82f6)]"
              : "border-transparent text-[var(--muted-foreground,#6b7280)] hover:text-[var(--foreground)]"
          }`}
        >
          Persons ({personEnrollments.length})
        </button>
        <button
          onClick={() => setActiveTab("organizations")}
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
            activeTab === "organizations"
              ? "border-[var(--color-primary,#3b82f6)] text-[var(--color-primary,#3b82f6)]"
              : "border-transparent text-[var(--muted-foreground,#6b7280)] hover:text-[var(--foreground)]"
          }`}
        >
          Organizations ({orgEnrollments.length})
        </button>
      </div>

      {/* Content */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-[var(--color-primary,#3b82f6)] border-t-transparent" />
        </div>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-[var(--border)]">
          <table className="w-full text-sm">
            <thead className="bg-[var(--muted,#f3f4f6)]">
              <tr>
                <th className="px-4 py-3 text-left font-medium">
                  {activeTab === "persons" ? "Name" : "Organization"}
                </th>
                <th className="px-4 py-3 text-left font-medium">Enrolled At</th>
                <th className="px-4 py-3 text-left font-medium">Status</th>
                <th className="px-4 py-3 text-right font-medium">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border)]">
              {(activeTab === "persons" ? personEnrollments : orgEnrollments).length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-4 py-8 text-center text-[var(--muted-foreground,#6b7280)]">
                    No {activeTab} enrolled in this league-season
                  </td>
                </tr>
              ) : (
                (activeTab === "persons" ? personEnrollments : orgEnrollments).map(
                  (enrollment) => (
                    <tr key={enrollment._id} className="hover:bg-[var(--muted,#f3f4f6)]/50">
                      <td className="px-4 py-3 font-medium">
                        {enrollment.entityName || enrollment.entityId.slice(-8)}
                      </td>
                      <td className="px-4 py-3 text-[var(--muted-foreground,#6b7280)]">
                        {new Date(enrollment.enrolledAt).toLocaleDateString()}
                      </td>
                      <td className="px-4 py-3">
                        <span className="rounded-full bg-green-100 text-green-700 px-2 py-0.5 text-xs font-medium">
                          Active
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end">
                          <button
                            onClick={() => handleRemove(enrollment)}
                            disabled={removingId === enrollment.entityId}
                            className="flex items-center gap-1 rounded p-1 hover:bg-red-50 text-red-600 transition-colors disabled:opacity-50 text-xs"
                            title="Remove enrollment"
                          >
                            <UserMinus className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                )
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Enroll Modal */}
      {showEnrollModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="w-full max-w-lg rounded-lg bg-[var(--background)] p-6 shadow-xl">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold">
                Enroll {enrollType === "person" ? "Person" : "Organization"}
              </h2>
              <button onClick={() => setShowEnrollModal(false)} className="rounded p-1 hover:bg-[var(--muted,#f3f4f6)]">
                <X className="h-5 w-5" />
              </button>
            </div>

            {enrollError && (
              <div className="mb-4 rounded-md bg-red-50 border border-red-200 p-3 text-sm text-red-700">
                {enrollError}
              </div>
            )}

            {loadingAvailable ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-[var(--color-primary,#3b82f6)]" />
              </div>
            ) : (
              <form onSubmit={handleEnroll} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-1">
                    {enrollType === "person" ? "Select Person" : "Select Organization"}
                  </label>
                  <select
                    required
                    value={selectedEntityId}
                    onChange={(e) => setSelectedEntityId(e.target.value)}
                    className="w-full rounded-md border border-[var(--border)] px-3 py-2 text-sm"
                  >
                    <option value="">
                      Choose {enrollType === "person" ? "a person" : "an organization"}...
                    </option>
                    {enrollType === "person"
                      ? availablePersons.map((p) => (
                          <option key={p._id} value={p._id}>
                            {p.name.first} {p.name.last} ({p.email})
                          </option>
                        ))
                      : availableOrgs.map((o) => (
                          <option key={o._id} value={o._id}>
                            {o.name}
                          </option>
                        ))}
                  </select>
                </div>

                <p className="text-xs text-[var(--muted-foreground,#6b7280)]">
                  Enrolling into: <strong>{activeLeagueName || "Active League"}</strong> (active season)
                </p>

                <div className="flex justify-end gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowEnrollModal(false)}
                    className="rounded-md border border-[var(--border)] px-4 py-2 text-sm font-medium hover:bg-[var(--muted,#f3f4f6)]"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={enrolling || !selectedEntityId}
                    className="rounded-md bg-[var(--color-primary,#3b82f6)] px-4 py-2 text-sm font-medium text-white hover:opacity-90 disabled:opacity-50"
                  >
                    {enrolling ? "Enrolling..." : "Enroll"}
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
