import React from "react";
import {
  Trophy,
  BarChart3,
  Award,
  Users,
  Palette,
  Flag,
} from "lucide-react";

const features = [
  {
    icon: Flag,
    title: "Race Management",
    description:
      "Organize and manage races across multiple formats — criteriums, road races, time trials, cyclocross, and gravel events. Track schedules, assign officials, and coordinate volunteers.",
  },
  {
    icon: BarChart3,
    title: "Standings & Competitions",
    description:
      "Automatic standings computation with configurable competitions, eligibility criteria, and scoring methods. Support for individual and team standings with historical tracking.",
  },
  {
    icon: Award,
    title: "Achievements & Awards",
    description:
      "Motivate riders with threshold-based achievements, peer-nominated awards, and calculated recognitions like Most Improved Rider. All displayed in personal trophy cases.",
  },
  {
    icon: Trophy,
    title: "Trophy Cases",
    description:
      "Showcase rider and team accomplishments with dedicated trophy case pages. Achievements, awards, and recognitions grouped by season for a complete history.",
  },
  {
    icon: Users,
    title: "Team Management",
    description:
      "Create and manage teams with member rosters. Track team standings, aggregate trophy cases, and build community through organized team structures.",
  },
  {
    icon: Palette,
    title: "Custom Branding",
    description:
      "Make the platform your own with configurable league branding — custom colors, logos, and league name applied across the entire application in real time.",
  },
];

export default function FeaturesPage() {
  return (
    <div className="min-h-screen bg-[var(--background)]">
      {/* Page Header */}
      <div className="border-b border-[var(--border)] bg-gradient-to-r from-[var(--color-primary,#1e3a5f)] to-[var(--color-secondary,#2d5a87)]">
        <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
          <h1 className="text-3xl font-bold text-white sm:text-4xl">
            Platform Features
          </h1>
          <p className="mt-2 text-white/70">
            Everything you need to run a professional racing league
          </p>
        </div>
      </div>

      {/* Feature Cards Grid */}
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
          {features.map((feature) => (
            <div
              key={feature.title}
              className="rounded-lg border border-[var(--border)] bg-[var(--card)] p-6 transition-shadow hover:shadow-md"
            >
              <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-[var(--color-primary,#1e3a5f)]/10">
                <feature.icon className="h-6 w-6 text-[var(--color-primary,#1e3a5f)]" />
              </div>
              <h3 className="mb-2 text-lg font-semibold text-[var(--foreground)]">
                {feature.title}
              </h3>
              <p className="text-sm leading-relaxed text-[var(--muted-foreground)]">
                {feature.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
