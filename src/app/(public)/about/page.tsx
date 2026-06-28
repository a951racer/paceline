import React from "react";
import { Target, History, Cog, Users } from "lucide-react";

export default function AboutPage() {
  return (
    <div className="min-h-screen bg-[var(--background)]">
      {/* Page Header */}
      <div className="border-b border-[var(--border)] bg-gradient-to-r from-[var(--color-primary,#1e3a5f)] to-[var(--color-secondary,#2d5a87)]">
        <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
          <h1 className="text-3xl font-bold text-white sm:text-4xl">
            About Our League
          </h1>
          <p className="mt-2 text-white/70">
            Building a stronger cycling community, one race at a time
          </p>
        </div>
      </div>

      {/* Content */}
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="grid gap-12 lg:grid-cols-2">
          {/* Mission */}
          <section className="flex flex-col gap-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[var(--color-primary,#1e3a5f)]/10">
                <Target className="h-5 w-5 text-[var(--color-primary,#1e3a5f)]" />
              </div>
              <h2 className="text-2xl font-semibold text-[var(--foreground)]">
                Our Mission
              </h2>
            </div>
            <p className="text-[var(--muted-foreground)] leading-relaxed">
              Our mission is to promote competitive cycling at all levels, foster
              sportsmanship, and create an inclusive environment where riders of
              every ability can challenge themselves, improve their skills, and
              connect with fellow cycling enthusiasts.
            </p>
            <p className="text-[var(--muted-foreground)] leading-relaxed">
              We believe that organized racing brings out the best in riders —
              pushing boundaries, building camaraderie, and celebrating the joy
              of cycling.
            </p>
          </section>

          {/* History */}
          <section className="flex flex-col gap-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[var(--color-primary,#1e3a5f)]/10">
                <History className="h-5 w-5 text-[var(--color-primary,#1e3a5f)]" />
              </div>
              <h2 className="text-2xl font-semibold text-[var(--foreground)]">
                Our History
              </h2>
            </div>
            <p className="text-[var(--muted-foreground)] leading-relaxed">
              Founded by a group of passionate amateur racers, our league started
              with a handful of local criterium events and a shared vision for a
              more organized racing community.
            </p>
            <p className="text-[var(--muted-foreground)] leading-relaxed">
              Over the years, we have grown into a thriving league with multiple
              race formats, a dedicated development academy, and a community of
              riders, volunteers, and officials who make every event possible.
            </p>
          </section>

          {/* How It Works */}
          <section className="flex flex-col gap-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[var(--color-primary,#1e3a5f)]/10">
                <Cog className="h-5 w-5 text-[var(--color-primary,#1e3a5f)]" />
              </div>
              <h2 className="text-2xl font-semibold text-[var(--foreground)]">
                How It Works
              </h2>
            </div>
            <p className="text-[var(--muted-foreground)] leading-relaxed">
              Races are organized into seasons, with points awarded based on
              finishing position. Riders accumulate points across multiple events
              to compete for overall standings in their category.
            </p>
            <p className="text-[var(--muted-foreground)] leading-relaxed">
              We support a variety of race formats including criteriums, road
              races, time trials, cyclocross, and gravel events — ensuring there
              is something for every type of rider.
            </p>
          </section>

          {/* Leadership */}
          <section className="flex flex-col gap-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[var(--color-primary,#1e3a5f)]/10">
                <Users className="h-5 w-5 text-[var(--color-primary,#1e3a5f)]" />
              </div>
              <h2 className="text-2xl font-semibold text-[var(--foreground)]">
                Leadership
              </h2>
            </div>
            <p className="text-[var(--muted-foreground)] leading-relaxed">
              Our league is governed by a dedicated group of administrators,
              race officials, and volunteers who ensure fair competition and a
              welcoming environment for all participants.
            </p>
            <p className="text-[var(--muted-foreground)] leading-relaxed">
              From course marshals to results coordinators, every member of our
              team plays a vital role in making race day run smoothly and safely.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
