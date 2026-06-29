"use client";

import React, { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { adminFetch } from "@/lib/admin-fetch";
import type { ReferenceDataItem, ReferenceDataType } from "@/types";

interface ReferenceDataFormProps {
  type: ReferenceDataType;
  editingItem: ReferenceDataItem | null;
  onClose: () => void;
  onSuccess: () => void;
}

interface FormErrors {
  key?: string;
  label?: string;
  description?: string;
  sortOrder?: string;
  general?: string;
}

/**
 * ReferenceDataForm component
 *
 * Create or edit a reference data item. In create mode the key field is
 * editable and required. In edit mode the key is shown as readonly, and
 * an isActive toggle is available.
 *
 * Requirements: 7.4, 7.5
 */
export function ReferenceDataForm({
  type,
  editingItem,
  onClose,
  onSuccess,
}: ReferenceDataFormProps) {
  const isEdit = editingItem !== null;
  const queryClient = useQueryClient();

  // Form state
  const [key, setKey] = useState(editingItem?.key ?? "");
  const [label, setLabel] = useState(editingItem?.label ?? "");
  const [description, setDescription] = useState(editingItem?.description ?? "");
  const [sortOrder, setSortOrder] = useState<string>(
    editingItem?.sortOrder != null ? String(editingItem.sortOrder) : ""
  );
  const [isActive, setIsActive] = useState(editingItem?.isActive ?? true);
  const [errors, setErrors] = useState<FormErrors>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  /** Client-side validation */
  function validate(): FormErrors {
    const errs: FormErrors = {};

    if (!isEdit) {
      if (!key.trim()) {
        errs.key = "Key is required";
      } else if (key.length > 30) {
        errs.key = "Key must be at most 30 characters";
      } else if (!/^[a-z0-9_]+$/.test(key)) {
        errs.key =
          "Key must contain only lowercase letters, numbers, and underscores";
      }
    }

    if (!label.trim()) {
      errs.label = "Label is required";
    } else if (label.length > 100) {
      errs.label = "Label must be at most 100 characters";
    }

    if (sortOrder.trim() !== "") {
      const num = Number(sortOrder);
      if (!Number.isInteger(num) || num < 0) {
        errs.sortOrder = "Sort order must be a non-negative integer";
      }
    }

    return errs;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    const validationErrors = validate();
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      return;
    }

    setErrors({});
    setIsSubmitting(true);

    try {
      if (isEdit) {
        await handleUpdate();
      } else {
        await handleCreate();
      }
    } catch (err) {
      setErrors({
        general:
          err instanceof Error ? err.message : "An unexpected error occurred",
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleCreate() {
    const body: Record<string, unknown> = {
      key: key.trim(),
      label: label.trim(),
      type,
    };

    if (description.trim()) {
      body.description = description.trim();
    }

    if (sortOrder.trim() !== "") {
      body.sortOrder = Number(sortOrder);
    }

    const res = await adminFetch("/api/admin/reference-data", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const data = await res.json().catch(() => null);
      if (res.status === 409 && data?.code === "REFERENCE_DATA_DUPLICATE_KEY") {
        setErrors({
          key: `A ${type.replace(/_/g, " ")} with key "${key.trim()}" already exists`,
        });
        return;
      }
      throw new Error(
        data?.message ?? `Failed to create item (${res.status})`
      );
    }

    // Invalidate reference data query cache and notify parent
    queryClient.invalidateQueries({ queryKey: ["reference-data", type] });
    onSuccess();
  }

  async function handleUpdate() {
    if (!editingItem) return;

    // Build payload with only changed fields
    const body: Record<string, unknown> = {};

    if (label.trim() !== editingItem.label) {
      body.label = label.trim();
    }
    if ((description.trim() || undefined) !== (editingItem.description || undefined)) {
      body.description = description.trim() || undefined;
    }
    if (
      sortOrder.trim() !== "" &&
      Number(sortOrder) !== editingItem.sortOrder
    ) {
      body.sortOrder = Number(sortOrder);
    } else if (sortOrder.trim() === "" && editingItem.sortOrder != null) {
      // Keep existing sortOrder if field cleared – don't send it
    }
    if (isActive !== editingItem.isActive) {
      body.isActive = isActive;
    }

    // Nothing changed
    if (Object.keys(body).length === 0) {
      onSuccess();
      return;
    }

    const res = await adminFetch(
      `/api/admin/reference-data/${editingItem._id}`,
      {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      }
    );

    if (!res.ok) {
      const data = await res.json().catch(() => null);
      throw new Error(
        data?.message ?? `Failed to update item (${res.status})`
      );
    }

    // Invalidate reference data query cache and notify parent
    queryClient.invalidateQueries({ queryKey: ["reference-data", type] });
    onSuccess();
  }

  return (
    <div className="mb-4 rounded-lg border border-[var(--border)] bg-[var(--background)] p-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold">
          {isEdit ? "Edit Item" : "Create New Item"}
        </h3>
        <button
          type="button"
          onClick={onClose}
          className="text-sm text-[var(--muted-foreground,#6b7280)] hover:text-[var(--foreground)] transition-colors"
        >
          Cancel
        </button>
      </div>

      {errors.general && (
        <div className="mb-4 rounded-md bg-red-50 border border-red-200 px-3 py-2 text-sm text-red-700">
          {errors.general}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Key field – only shown/editable in create mode */}
        {!isEdit ? (
          <div>
            <label
              htmlFor="ref-data-key"
              className="block text-sm font-medium mb-1"
            >
              Key <span className="text-red-500">*</span>
            </label>
            <input
              id="ref-data-key"
              type="text"
              value={key}
              onChange={(e) => setKey(e.target.value.toLowerCase())}
              placeholder="e.g. my_category"
              className={`w-full rounded-md border px-3 py-2 text-sm ${
                errors.key
                  ? "border-red-400 focus:ring-red-400"
                  : "border-[var(--border)] focus:ring-[var(--color-primary,#3b82f6)]"
              } focus:outline-none focus:ring-2`}
              disabled={isSubmitting}
              autoComplete="off"
              maxLength={30}
            />
            <p className="mt-1 text-xs text-[var(--muted-foreground,#6b7280)]">
              Lowercase letters, numbers, and underscores only. 1-30 characters.
            </p>
            {errors.key && (
              <p className="mt-1 text-xs text-red-600">{errors.key}</p>
            )}
          </div>
        ) : (
          <div>
            <label
              htmlFor="ref-data-key"
              className="block text-sm font-medium mb-1"
            >
              Key
            </label>
            <input
              id="ref-data-key"
              type="text"
              value={editingItem?.key ?? ""}
              disabled
              className="w-full rounded-md border border-[var(--border)] bg-[var(--muted,#f3f4f6)] px-3 py-2 text-sm text-[var(--muted-foreground,#6b7280)] cursor-not-allowed"
            />
          </div>
        )}

        {/* Label field */}
        <div>
          <label
            htmlFor="ref-data-label"
            className="block text-sm font-medium mb-1"
          >
            Label <span className="text-red-500">*</span>
          </label>
          <input
            id="ref-data-label"
            type="text"
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            placeholder="Display name"
            className={`w-full rounded-md border px-3 py-2 text-sm ${
              errors.label
                ? "border-red-400 focus:ring-red-400"
                : "border-[var(--border)] focus:ring-[var(--color-primary,#3b82f6)]"
            } focus:outline-none focus:ring-2`}
            disabled={isSubmitting}
            maxLength={100}
          />
          {errors.label && (
            <p className="mt-1 text-xs text-red-600">{errors.label}</p>
          )}
        </div>

        {/* Description field (optional) */}
        <div>
          <label
            htmlFor="ref-data-description"
            className="block text-sm font-medium mb-1"
          >
            Description{" "}
            <span className="text-[var(--muted-foreground,#6b7280)] font-normal">
              (optional)
            </span>
          </label>
          <textarea
            id="ref-data-description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Optional description"
            rows={2}
            className="w-full rounded-md border border-[var(--border)] px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-primary,#3b82f6)]"
            disabled={isSubmitting}
          />
          {errors.description && (
            <p className="mt-1 text-xs text-red-600">{errors.description}</p>
          )}
        </div>

        {/* Sort Order field (optional) */}
        <div>
          <label
            htmlFor="ref-data-sort-order"
            className="block text-sm font-medium mb-1"
          >
            Sort Order{" "}
            <span className="text-[var(--muted-foreground,#6b7280)] font-normal">
              (optional)
            </span>
          </label>
          <input
            id="ref-data-sort-order"
            type="number"
            value={sortOrder}
            onChange={(e) => setSortOrder(e.target.value)}
            placeholder="Auto-assigned if empty"
            min={0}
            step={1}
            className={`w-full rounded-md border px-3 py-2 text-sm ${
              errors.sortOrder
                ? "border-red-400 focus:ring-red-400"
                : "border-[var(--border)] focus:ring-[var(--color-primary,#3b82f6)]"
            } focus:outline-none focus:ring-2`}
            disabled={isSubmitting}
          />
          <p className="mt-1 text-xs text-[var(--muted-foreground,#6b7280)]">
            Leave empty to auto-assign the next available position.
          </p>
          {errors.sortOrder && (
            <p className="mt-1 text-xs text-red-600">{errors.sortOrder}</p>
          )}
        </div>

        {/* isActive toggle – only in edit mode */}
        {isEdit && (
          <div className="flex items-center gap-3">
            <label
              htmlFor="ref-data-active"
              className="text-sm font-medium"
            >
              Active
            </label>
            <button
              id="ref-data-active"
              type="button"
              role="switch"
              aria-checked={isActive}
              onClick={() => setIsActive(!isActive)}
              disabled={isSubmitting}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                isActive
                  ? "bg-[var(--color-primary,#3b82f6)]"
                  : "bg-gray-300"
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  isActive ? "translate-x-6" : "translate-x-1"
                }`}
              />
            </button>
            <span className="text-xs text-[var(--muted-foreground,#6b7280)]">
              {isActive ? "Item will appear in selection lists" : "Item hidden from selection lists"}
            </span>
          </div>
        )}

        {/* Submit/Cancel buttons */}
        <div className="flex items-center gap-3 pt-2">
          <button
            type="submit"
            disabled={isSubmitting}
            className="rounded-md bg-[var(--color-primary,#3b82f6)] px-4 py-2 text-sm font-medium text-white hover:opacity-90 transition-opacity disabled:opacity-50"
          >
            {isSubmitting
              ? "Saving..."
              : isEdit
              ? "Save Changes"
              : "Create Item"}
          </button>
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="rounded-md border border-[var(--border)] px-4 py-2 text-sm font-medium hover:bg-[var(--muted,#f3f4f6)] transition-colors disabled:opacity-50"
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}
