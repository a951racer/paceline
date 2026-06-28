"use client";

import React from "react";
import {
  Calendar,
  MapPin,
  Trophy,
  Award,
  Users,
  Heart,
  ClipboardList,
  Bell,
  TrendingUp,
  Star,
  ChevronRight,
  Shield,
} from "lucide-react";

// --- Mock Data ---

const mockUpcomingEvents = [
  { id: "1", name: "Spring Classic Criterium", date: "Mar 22, 2024", location: "Riverside Park Circuit", daysUntil: 3 },
  { id: "2", name: "Hill Climb Championship", date: "Mar 29, 2024", location: "Eagle Mountain Road", daysUntil: 10 },
  { id: "3", name: "Time Trial Series #4", date: "Apr 5, 2024", location: "Lakeside Circuit", daysUntil: 17 },
  { id: "4", name: "Gravel Adventure 75k", date: "Apr 12, 2024", location: "Forest Trails", daysUntil: 24 },
];

const mockStandingsHighlights = [
  { position: 1, name: "Marcus Chen", points: 1245, trend: "up" },
  { position: 2, name: "Sarah Williams", points: 1180, trend: "up" },
  { position: 3, name: "Alex Johnson", points: 847, trend: "same" },
  { position: 4, name: "Jordan Lee", points: 820, trend: "down" },
  { position: 5, name: "Taylor Kim", points: 790, trend: "up" },
];

const mockRoleInfo = {
  role: "volunteer",
  title: "Volunteer Assignments",
  description: "Your upcoming volunteer duties for the league.",
  items: [
    { id: "1", task: "Course Marshal", race: "Spring Classic Criterium", date: "Mar 22" },
    { id: "2", task: "Registration Desk", race: "Hill Climb Championship", date: "Mar 29" },
    { id: "3", task: "Finish Line Timer", race: "Time Trial Series #4", date: "Apr 5" },
  ],
};

const mockAwards = [
  { id: "1", name: "Outstanding Volunteer", icon: "🌟", date: "Feb 2024" },
  { id: "2", name: "Community Spirit", icon: "💪", date: "Jan 2024" },
];

const mockNotifications = [
  { id: "1", message: "New race schedule published for April", time: "1 day ago" },
  { id: "2", message: "Volunteer sign-up open for Gravel Adventure", time: "3 days ago" },
];

// --- Widget Components ---

function UpcomingEventsWidget() {
  return (
    <div className="rounded-xl border border-[var(--border)] bg-[var(--background)] p-6 shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-[var(--muted-foreground,#6b7280)] uppercase tracking-wide">
          Upcoming Races
        </h3>
        <Calendar className="h-5 w-5 text-[var(--color-primary,#3b82f6)]" />
      </div>
      <div className="space-y-3">
        {mockUpcomingEvents.map((event) => (
          <div
            key={event.id}
            className="flex items-center gap-3 rounded-lg border border-[var(--border)] p-3 hover:border-[var(--color-primary,#3b82f6)] transition-colors"
          >
            <div className="flex h-10 w-10 shrink-0 flex-col items-center justify-center rounded-lg bg-[var(--color-primary,#3b82f6)]/10 text-[var(--color-primary,#3b82f6)]">
              <span className="text-xs font-bold leading-none">
                {event.daysUntil}
              </span>
              <span className="text-[9px] uppercase">days</span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-[var(--foreground)] truncate">
                {event.name}
              </p>
              <div className="flex items-center gap-1 text-xs text-[var(--muted-foreground,#6b7280)]">
                <MapPin className="h-3 w-3" />
                <span className="truncate">{event.location}</span>
              </div>
            </div>
            <span className="text-xs text-[var(--muted-foreground,#6b7280)] whitespace-nowrap">
              {event.date}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

function StandingsHighlightsWidget() {
  function getTrendIcon(trend: string) {
    if (trend === "up") return <TrendingUp className="h-3.5 w-3.5 text-green-500" />;
    if (trend === "down") return <TrendingUp className="h-3.5 w-3.5 text-red-500 rotate-180" />;
    return <span className="h-3.5 w-3.5 text-gray-400 text-center">—</span>;
  }

  return (
    <div className="rounded-xl border border-[var(--border)] bg-[var(--background)] p-6 shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-[var(--muted-foreground,#6b7280)] uppercase tracking-wide">
          Standings Highlights
        </h3>
        <Trophy className="h-5 w-5 text-[var(--color-primary,#3b82f6)]" />
      </div>
      <div className="space-y-2">
        {mockStandingsHighlights.map((entry) => (
          <div
            key={entry.position}
            className="flex items-center gap-3 rounded-lg p-2 hover:bg-[var(--muted,#f3f4f6)] transition-colors"
          >
            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[var(--muted,#f3f4f6)] text-xs font-bold text-[var(--foreground)]">
              {entry.position}
            </span>
            <span className="flex-1 text-sm font-medium text-[var(--foreground)] truncate">
              {entry.name}
            </span>
            <span className="text-xs text-[var(--muted-foreground,#6b7280)]">
              {entry.points} pts
            </span>
            {getTrendIcon(entry.trend)}
          </div>
        ))}
      </div>
      <a
        href="/standings"
        className="mt-4 flex items-center justify-center gap-1 text-xs font-medium text-[var(--color-primary,#3b82f6)] hover:underline"
      >
        View Full Standings
        <ChevronRight className="h-3.5 w-3.5" />
      </a>
    </div>
  );
}

function RoleInfoWidget() {
  function getRoleIcon(role: string) {
    switch (role) {
      case "volunteer":
        return <Heart className="h-5 w-5 text-pink-500" />;
      case "mentor":
        return <Users className="h-5 w-5 text-purple-500" />;
      case "race_official":
        return <Shield className="h-5 w-5 text-blue-500" />;
      default:
        return <Star className="h-5 w-5 text-yellow-500" />;
    }
  }

  return (
    <div className="rounded-xl border border-[var(--border)] bg-[var(--background)] p-6 shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-[var(--muted-foreground,#6b7280)] uppercase tracking-wide">
          {mockRoleInfo.title}
        </h3>
        {getRoleIcon(mockRoleInfo.role)}
      </div>
      <p className="text-xs text-[var(--muted-foreground,#6b7280)] mb-4">
        {mockRoleInfo.description}
      </p>
      <div className="space-y-2">
        {mockRoleInfo.items.map((item) => (
          <div
            key={item.id}
            className="flex items-center gap-3 rounded-lg border border-[var(--border)] p-3"
          >
            <ClipboardList className="h-4 w-4 text-[var(--muted-foreground,#6b7280)] shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-[var(--foreground)]">{item.task}</p>
              <p className="text-xs text-[var(--muted-foreground,#6b7280)]">{item.race}</p>
            </div>
            <span className="text-xs text-[var(--muted-foreground,#6b7280)] whitespace-nowrap">
              {item.date}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

function AwardsWidget() {
  return (
    <div className="rounded-xl border border-[var(--border)] bg-[var(--background)] p-6 shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-[var(--muted-foreground,#6b7280)] uppercase tracking-wide">
          My Awards
        </h3>
        <Award className="h-5 w-5 text-[var(--color-primary,#3b82f6)]" />
      </div>

      {/* Earned Awards */}
      {mockAwards.length > 0 ? (
        <div className="space-y-2 mb-4">
          {mockAwards.map((award) => (
            <div
              key={award.id}
              className="flex items-center gap-3 rounded-lg bg-[var(--muted,#f3f4f6)] p-3"
            >
              <span className="text-xl">{award.icon}</span>
              <div className="flex-1">
                <p className="text-sm font-medium text-[var(--foreground)]">{award.name}</p>
                <p className="text-xs text-[var(--muted-foreground,#6b7280)]">{award.date}</p>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-sm text-[var(--muted-foreground,#6b7280)] mb-4">
          No awards yet. Keep contributing!
        </p>
      )}

      {/* Notifications */}
      <div className="border-t border-[var(--border)] pt-4">
        <div className="flex items-center gap-2 mb-3">
          <Bell className="h-4 w-4 text-[var(--muted-foreground,#6b7280)]" />
          <span className="text-xs font-semibold text-[var(--muted-foreground,#6b7280)] uppercase">
            Notifications
          </span>
        </div>
        <div className="space-y-2">
          {mockNotifications.map((notification) => (
            <div key={notification.id} className="flex items-start gap-2">
              <div className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-[var(--color-primary,#3b82f6)]" />
              <div>
                <p className="text-xs text-[var(--foreground)]">{notification.message}</p>
                <p className="text-[10px] text-[var(--muted-foreground,#6b7280)]">{notification.time}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// --- Main Component ---

export function GeneralDashboard() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-[var(--foreground)]">Dashboard</h1>
        <p className="mt-1 text-sm text-[var(--muted-foreground,#6b7280)]">
          Stay up to date with league events and your contributions.
        </p>
      </div>

      {/* Top Row */}
      <div className="grid gap-6 md:grid-cols-2">
        <UpcomingEventsWidget />
        <StandingsHighlightsWidget />
      </div>

      {/* Bottom Row */}
      <div className="grid gap-6 md:grid-cols-2">
        <RoleInfoWidget />
        <AwardsWidget />
      </div>
    </div>
  );
}
