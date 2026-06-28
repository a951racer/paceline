"use client";

import React from "react";
import {
  Users,
  Flag,
  ListOrdered,
  Calendar,
  Clock,
  AlertTriangle,
  CheckCircle2,
  Bell,
  UserPlus,
  Trophy,
  ChevronRight,
  Activity,
  BarChart3,
} from "lucide-react";

// --- Mock Data ---

const mockRecentActivity = [
  { id: "1", action: "Race results entered", details: "Downtown Criterium - 24 finishers", time: "2 hours ago", icon: ListOrdered },
  { id: "2", action: "New registration", details: "Maria Santos joined the league", time: "4 hours ago", icon: UserPlus },
  { id: "3", action: "Nomination submitted", details: "Peer nomination for Sportsmanship Award", time: "6 hours ago", icon: Trophy },
  { id: "4", action: "Season standings updated", details: "Spring 2024 recalculated", time: "1 day ago", icon: BarChart3 },
  { id: "5", action: "Race created", details: "Hill Climb Championship - Mar 29", time: "2 days ago", icon: Flag },
];

const mockSeasonStatus = {
  name: "Spring 2024",
  startDate: "Jan 15, 2024",
  endDate: "Jun 30, 2024",
  racesCompleted: 8,
  racesTotal: 18,
  upcomingRaces: [
    { id: "1", name: "Spring Classic Criterium", date: "Mar 22", location: "Riverside Park" },
    { id: "2", name: "Hill Climb Championship", date: "Mar 29", location: "Eagle Mountain" },
    { id: "3", name: "Time Trial Series #4", date: "Apr 5", location: "Lakeside Circuit" },
  ],
};

const mockActionItems = [
  { id: "1", type: "nomination", title: "3 pending peer nominations", severity: "warning" as const },
  { id: "2", type: "results", title: "2 races missing results", severity: "error" as const },
  { id: "3", type: "alert", title: "Season ends in 98 days", severity: "info" as const },
];

// --- Widget Components ---

function QuickActionsWidget() {
  const actions = [
    { label: "Add Results", icon: ListOrdered, href: "/admin/results", color: "bg-blue-500" },
    { label: "Manage People", icon: Users, href: "/admin/people", color: "bg-green-500" },
    { label: "Manage Races", icon: Flag, href: "/admin/races", color: "bg-purple-500" },
  ];

  return (
    <div className="rounded-xl border border-[var(--border)] bg-[var(--background)] p-6 shadow-sm">
      <h3 className="text-sm font-semibold text-[var(--muted-foreground,#6b7280)] uppercase tracking-wide mb-4">
        Quick Actions
      </h3>
      <div className="grid grid-cols-3 gap-3">
        {actions.map((action) => {
          const Icon = action.icon;
          return (
            <a
              key={action.label}
              href={action.href}
              className="flex flex-col items-center gap-2 rounded-lg border border-[var(--border)] p-4 hover:border-[var(--color-primary,#3b82f6)] hover:bg-[var(--muted,#f3f4f6)] transition-colors"
            >
              <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${action.color} text-white`}>
                <Icon className="h-5 w-5" />
              </div>
              <span className="text-xs font-medium text-[var(--foreground)] text-center">
                {action.label}
              </span>
            </a>
          );
        })}
      </div>
    </div>
  );
}

function RecentActivityWidget() {
  return (
    <div className="rounded-xl border border-[var(--border)] bg-[var(--background)] p-6 shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-[var(--muted-foreground,#6b7280)] uppercase tracking-wide">
          Recent Activity
        </h3>
        <Activity className="h-5 w-5 text-[var(--color-primary,#3b82f6)]" />
      </div>
      <div className="space-y-4">
        {mockRecentActivity.map((item) => {
          const Icon = item.icon;
          return (
            <div key={item.id} className="flex items-start gap-3">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[var(--muted,#f3f4f6)]">
                <Icon className="h-4 w-4 text-[var(--muted-foreground,#6b7280)]" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-[var(--foreground)]">{item.action}</p>
                <p className="text-xs text-[var(--muted-foreground,#6b7280)]">{item.details}</p>
              </div>
              <span className="text-xs text-[var(--muted-foreground,#6b7280)] whitespace-nowrap">
                {item.time}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function SeasonStatusWidget() {
  const progressPercentage = (mockSeasonStatus.racesCompleted / mockSeasonStatus.racesTotal) * 100;

  return (
    <div className="rounded-xl border border-[var(--border)] bg-[var(--background)] p-6 shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-[var(--muted-foreground,#6b7280)] uppercase tracking-wide">
          Season Status
        </h3>
        <Calendar className="h-5 w-5 text-[var(--color-primary,#3b82f6)]" />
      </div>
      <div className="mb-4">
        <p className="text-lg font-bold text-[var(--foreground)]">{mockSeasonStatus.name}</p>
        <p className="text-xs text-[var(--muted-foreground,#6b7280)]">
          {mockSeasonStatus.startDate} — {mockSeasonStatus.endDate}
        </p>
      </div>
      <div className="mb-4">
        <div className="flex items-center justify-between text-xs text-[var(--muted-foreground,#6b7280)] mb-1">
          <span>Races completed</span>
          <span>{mockSeasonStatus.racesCompleted}/{mockSeasonStatus.racesTotal}</span>
        </div>
        <div className="w-full bg-[var(--border)] rounded-full h-2">
          <div
            className="bg-[var(--color-primary,#3b82f6)] h-2 rounded-full transition-all"
            style={{ width: `${progressPercentage}%` }}
          />
        </div>
      </div>
      <div>
        <p className="text-xs font-semibold text-[var(--muted-foreground,#6b7280)] uppercase mb-2">
          Upcoming Races
        </p>
        <div className="space-y-2">
          {mockSeasonStatus.upcomingRaces.map((race) => (
            <div key={race.id} className="flex items-center gap-2 text-sm">
              <Clock className="h-3.5 w-3.5 text-[var(--muted-foreground,#6b7280)]" />
              <span className="font-medium text-[var(--foreground)] flex-1 truncate">{race.name}</span>
              <span className="text-xs text-[var(--muted-foreground,#6b7280)]">{race.date}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function ActionItemsWidget() {
  function getSeverityStyles(severity: "warning" | "error" | "info") {
    switch (severity) {
      case "error":
        return { bg: "bg-red-50", border: "border-red-200", icon: AlertTriangle, iconColor: "text-red-500" };
      case "warning":
        return { bg: "bg-yellow-50", border: "border-yellow-200", icon: Bell, iconColor: "text-yellow-500" };
      case "info":
        return { bg: "bg-blue-50", border: "border-blue-200", icon: CheckCircle2, iconColor: "text-blue-500" };
    }
  }

  return (
    <div className="rounded-xl border border-[var(--border)] bg-[var(--background)] p-6 shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-[var(--muted-foreground,#6b7280)] uppercase tracking-wide">
          Action Items
        </h3>
        <AlertTriangle className="h-5 w-5 text-[var(--color-primary,#3b82f6)]" />
      </div>
      <div className="space-y-3">
        {mockActionItems.map((item) => {
          const styles = getSeverityStyles(item.severity);
          const Icon = styles.icon;
          return (
            <div
              key={item.id}
              className={`flex items-center gap-3 rounded-lg border ${styles.border} ${styles.bg} p-3`}
            >
              <Icon className={`h-4 w-4 ${styles.iconColor} shrink-0`} />
              <span className="text-sm font-medium text-[var(--foreground)] flex-1">
                {item.title}
              </span>
              <ChevronRight className="h-4 w-4 text-[var(--muted-foreground,#6b7280)]" />
            </div>
          );
        })}
      </div>
    </div>
  );
}

// --- Main Component ---

export function AdminDashboard() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-[var(--foreground)]">Admin Dashboard</h1>
        <p className="mt-1 text-sm text-[var(--muted-foreground,#6b7280)]">
          Manage your league operations and track activity.
        </p>
      </div>

      {/* Top Row */}
      <div className="grid gap-6 md:grid-cols-2">
        <QuickActionsWidget />
        <ActionItemsWidget />
      </div>

      {/* Bottom Row */}
      <div className="grid gap-6 md:grid-cols-2">
        <RecentActivityWidget />
        <SeasonStatusWidget />
      </div>
    </div>
  );
}
