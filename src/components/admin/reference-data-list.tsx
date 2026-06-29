"use client";

import React, { useState } from "react";
import { Pencil, Trash2, Power, PowerOff } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { adminFetch } from "@/lib/admin-fetch";
import type { ReferenceDataItem } from "@/types";

interface ReferenceDataListProps {
  items: ReferenceDataItem[];
  onEdit: (item: ReferenceDataItem) => void;
}

/**
 * ReferenceDataList component
 *
 * Displays reference data items sorted by sortOrder with action buttons
 * for Edit, Deactivate/Reactivate, and Delete. Inactive items are shown
 * with visual distinction (greyed-out, strikethrough, badge). Delete shows
 * a confirmation dialog and displays an error if the item is in use.
 *
 * Requirements: 7.5, 7.6, 7.7, 7.8
 */
export function ReferenceDataList({ items, onEdit }: ReferenceDataListProps) {
  const queryClient = useQueryClient();
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [togglingId, setTogglingId] = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [confirmDeleteItem, setConfirmDeleteItem] = useState<ReferenceDataItem | null>(null);

  if (items.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-[var(--border)] py-8 text-center">
        <p className="text-sm text-[var(--muted-foreground,#6b7280)]">
          No items yet. Click &quot;Add Item&quot; to create one.
        </p>
      </div>
    );
  }

  async function handleToggleActive(item: ReferenceDataItem) {
    setTogglingId(item._id);
    setDeleteError(null);

    try {
      const res = await adminFetch(`/api/admin/reference-data/${item._id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: !item.isActive }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(
          data?.message ?? `Failed to ${item.isActive ? "deactivate" : "reactivate"} item`
        );
      }

      queryClient.invalidateQueries({ queryKey: ["reference-data", item.type] });
    } catch (err) {
      setDeleteError(
        err instanceof Error ? err.message : "An unexpected error occurred"
      );
    } finally {
      setTogglingId(null);
    }
  }

  async function handleDelete(item: ReferenceDataItem) {
    setDeletingId(item._id);
    setDeleteError(null);

    try {
      const res = await adminFetch(`/api/admin/reference-data/${item._id}`, {
        method: "DELETE",
      });

      if (!res.ok) {
        const data = await res.json().catch(() => null);
        if (res.status === 409 && data?.code === "REFERENCE_DATA_IN_USE") {
          setDeleteError(
            data?.message ??
              `Cannot delete "${item.label}" because it is currently in use by existing records.`
          );
        } else {
          throw new Error(
            data?.message ?? `Failed to delete item (${res.status})`
          );
        }
        return;
      }

      queryClient.invalidateQueries({ queryKey: ["reference-data", item.type] });
    } catch (err) {
      setDeleteError(
        err instanceof Error ? err.message : "An unexpected error occurred"
      );
    } finally {
      setDeletingId(null);
      setConfirmDeleteItem(null);
    }
  }

  return (
    <div className="space-y-2">
      {/* Error banner */}
      {deleteError && (
        <div className="rounded-md bg-red-50 border border-red-200 px-3 py-2 text-sm text-red-700 flex items-center justify-between">
          <span>{deleteError}</span>
          <button
            onClick={() => setDeleteError(null)}
            className="ml-2 text-red-500 hover:text-red-700 font-medium text-xs"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Confirmation dialog */}
      {confirmDeleteItem && (
        <div className="rounded-md border border-yellow-300 bg-yellow-50 px-4 py-3 text-sm">
          <p className="font-medium text-yellow-800">
            Delete &quot;{confirmDeleteItem.label}&quot;?
          </p>
          <p className="mt-1 text-yellow-700">
            This action cannot be undone. The item will be permanently removed if
            it is not referenced by any existing records.
          </p>
          <div className="mt-3 flex items-center gap-2">
            <button
              onClick={() => handleDelete(confirmDeleteItem)}
              disabled={deletingId === confirmDeleteItem._id}
              className="rounded-md bg-red-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-red-700 transition-colors disabled:opacity-50"
            >
              {deletingId === confirmDeleteItem._id ? "Deleting..." : "Confirm Delete"}
            </button>
            <button
              onClick={() => {
                setConfirmDeleteItem(null);
                setDeleteError(null);
              }}
              disabled={deletingId === confirmDeleteItem._id}
              className="rounded-md border border-[var(--border)] px-3 py-1.5 text-xs font-medium hover:bg-[var(--muted,#f3f4f6)] transition-colors disabled:opacity-50"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Item list */}
      {items.map((item) => (
        <div
          key={item._id}
          className={`flex items-center justify-between rounded-lg border px-4 py-3 transition-colors ${
            item.isActive
              ? "border-[var(--border)] bg-[var(--background)]"
              : "border-[var(--border)] bg-[var(--muted,#f3f4f6)] opacity-60"
          }`}
        >
          {/* Item info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span
                className={`text-sm font-medium ${
                  item.isActive
                    ? "text-[var(--foreground)]"
                    : "text-[var(--muted-foreground,#6b7280)] line-through"
                }`}
              >
                {item.label}
              </span>
              <span className="text-xs text-[var(--muted-foreground,#6b7280)] font-mono">
                {item.key}
              </span>
              {!item.isActive && (
                <span className="rounded-full bg-gray-200 px-2 py-0.5 text-[10px] font-medium text-gray-600 uppercase tracking-wide">
                  Inactive
                </span>
              )}
            </div>
            {item.description && (
              <p className="mt-0.5 text-xs text-[var(--muted-foreground,#6b7280)] truncate">
                {item.description}
              </p>
            )}
          </div>

          {/* Sort order indicator */}
          <span className="mx-3 text-xs text-[var(--muted-foreground,#6b7280)] whitespace-nowrap">
            #{item.sortOrder}
          </span>

          {/* Action buttons */}
          <div className="flex items-center gap-1">
            {/* Edit */}
            <button
              onClick={() => onEdit(item)}
              title="Edit"
              className="rounded-md p-1.5 text-[var(--muted-foreground,#6b7280)] hover:text-[var(--foreground)] hover:bg-[var(--muted,#f3f4f6)] transition-colors"
            >
              <Pencil className="h-4 w-4" />
            </button>

            {/* Deactivate / Reactivate */}
            <button
              onClick={() => handleToggleActive(item)}
              disabled={togglingId === item._id}
              title={item.isActive ? "Deactivate" : "Reactivate"}
              className={`rounded-md p-1.5 transition-colors disabled:opacity-50 ${
                item.isActive
                  ? "text-yellow-600 hover:text-yellow-700 hover:bg-yellow-50"
                  : "text-green-600 hover:text-green-700 hover:bg-green-50"
              }`}
            >
              {item.isActive ? (
                <PowerOff className="h-4 w-4" />
              ) : (
                <Power className="h-4 w-4" />
              )}
            </button>

            {/* Delete */}
            <button
              onClick={() => {
                setDeleteError(null);
                setConfirmDeleteItem(item);
              }}
              disabled={deletingId === item._id}
              title="Delete"
              className="rounded-md p-1.5 text-red-500 hover:text-red-700 hover:bg-red-50 transition-colors disabled:opacity-50"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
