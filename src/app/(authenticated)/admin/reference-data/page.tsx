"use client";

import React, { useState } from "react";
import { Database } from "lucide-react";
import { ReferenceDataTab } from "@/components/admin/reference-data-tab";
import type { ReferenceDataType } from "@/types";

const tabs: { label: string; type: ReferenceDataType }[] = [
  { label: "Categories", type: "category" },
  { label: "Race Types", type: "race_type" },
  { label: "Organization Types", type: "organization_type" },
  { label: "Person Types", type: "person_type" },
];

/**
 * Reference Data Admin Page
 *
 * Admin page for managing league-scoped reference data.
 * Displays four tabs: Categories, Race Types, Organization Types, Person Types.
 * Each tab renders a ReferenceDataTab component with the appropriate type.
 *
 * Requirements: 7.1, 7.2, 7.3
 */
export default function ReferenceDataPage() {
  const [activeTab, setActiveTab] = useState<ReferenceDataType>("category");

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <Database className="h-6 w-6 text-[var(--color-primary,#3b82f6)]" />
        <h1 className="text-2xl font-bold text-[var(--foreground)]">Reference Data</h1>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-4 border-b border-[var(--border)]">
        {tabs.map((tab) => (
          <button
            key={tab.type}
            onClick={() => setActiveTab(tab.type)}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              activeTab === tab.type
                ? "border-[var(--primary,#B87333)] text-[var(--foreground,#F0F1F3)]"
                : "border-transparent text-[var(--muted-foreground,#6b7280)] hover:text-[var(--foreground)]"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <ReferenceDataTab type={activeTab} />
    </div>
  );
}
