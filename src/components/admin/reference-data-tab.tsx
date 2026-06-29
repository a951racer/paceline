"use client";

import React, { useState } from "react";
import { Plus } from "lucide-react";
import { useReferenceData } from "@/hooks/use-reference-data";
import { ReferenceDataForm } from "@/components/admin/reference-data-form";
import { ReferenceDataList } from "@/components/admin/reference-data-list";
import type { ReferenceDataItem, ReferenceDataType } from "@/types";

interface ReferenceDataTabProps {
  type: ReferenceDataType;
}

/**
 * ReferenceDataTab component
 *
 * Displays the list of reference data items for a given type,
 * along with create/edit form and action buttons. Shows all items
 * (active + inactive) sorted by sortOrder. Inactive items are
 * visually distinguished with a greyed-out appearance and badge.
 *
 * Requirements: 7.3, 7.4, 7.7
 */
export function ReferenceDataTab({ type }: ReferenceDataTabProps) {
  const { items, isLoading } = useReferenceData(type);
  const [editingItem, setEditingItem] = useState<ReferenceDataItem | null>(null);
  const [showForm, setShowForm] = useState(false);

  const sortedItems = [...items].sort((a, b) => a.sortOrder - b.sortOrder);

  const handleCreate = () => {
    setEditingItem(null);
    setShowForm(true);
  };

  const handleEdit = (item: ReferenceDataItem) => {
    setEditingItem(item);
    setShowForm(true);
  };

  const handleFormClose = () => {
    setShowForm(false);
    setEditingItem(null);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-[var(--color-primary,#3b82f6)] border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="py-4">
      {/* Header with Add button */}
      <div className="flex items-center justify-between mb-4">
        <p className="text-sm text-[var(--muted-foreground,#6b7280)]">
          {sortedItems.length} item{sortedItems.length !== 1 ? "s" : ""}
        </p>
        <button
          onClick={handleCreate}
          className="flex items-center gap-2 rounded-md bg-[var(--color-primary,#3b82f6)] px-4 py-2 text-sm font-medium text-white hover:opacity-90 transition-opacity"
        >
          <Plus className="h-4 w-4" />
          Add Item
        </button>
      </div>

      {/* Create/Edit Form */}
      {showForm && (
        <ReferenceDataForm
          type={type}
          editingItem={editingItem}
          onClose={handleFormClose}
          onSuccess={handleFormClose}
        />
      )}

      {/* Item List */}
      <ReferenceDataList
        items={sortedItems}
        onEdit={handleEdit}
      />
    </div>
  );
}


