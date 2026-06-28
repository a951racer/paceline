import React from "react";
import {
  GraduationCap,
  BookOpen,
  UserPlus,
  Star,
} from "lucide-react";

export default function AcademyPage() {
  return (
    <div className="min-h-screen bg-[var(--background)]">
      {/* Page Header */}
      <div className="border-b border-[var(--border)] bg-gradient-to-r from-[var(--color-primary,#1e3a5f)] to-[var(--color-secondary,#2d5a87)]">
        <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
          <h1 className="text-3xl font-bold text-white sm:text-4xl">
            Development Academy
          </h1>
          <p className="mt-2 text-white/70">
            Grow your skills and advance through the ranks
          </p>
        </div>
      </div>

      {/* Content */}
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        {/* What is the Academy */}
        <section className="mb-12">
          <div className="flex items-center gap-3 mb-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[var(--color-primary,#1e3a5f)]/10">
              <GraduationCap className="h-5 w-5 text-[var(--color-primary,#1e3a5f)]" />
            </div>
            <h2 className="text-2xl font-semibold text-[var(--foreground)]">
              What is the Academy?
            </h2>
          </div>
          <p className="text-[var(--muted-foreground)] leading-relaxed max-w-3xl">
            The Development Academy is our structured rider progression program
            designed to help cyclists at every level improve their race craft,
            fitness, and tactical awareness. Whether you are brand new to racing
            or looking to move up a category, the Academy provides coaching,
            resources, and a supportive community.
          </p>
        </section>

        {/* Programs Offered */}
        <section className="mb-12">
          <div className="flex items-center gap-3 mb-6">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[var(--color-primary,#1e3a5f)]/10">
              <BookOpen className="h-5 w-5 text-[var(--color-primary,#1e3a5f)]" />
            </div>
            <h2 className="text-2xl font-semibold text-[var(--foreground)]">
              Programs Offered
            </h2>
          </div>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            <div className="rounded-lg border border-[var(--border)] bg-[var(--card)] p-6">
              <h3 className="text-lg font-semibold text-[var(--foreground)] mb-2">
                Beginner Program
              </h3>
              <p className="text-sm text-[var(--muted-foreground)]">
                Learn the basics of pack riding, race etiquette, and get
                comfortable in a competitive environment. Perfect for those new
                to organized racing.
              </p>
            </div>
            <div className="rounded-lg border border-[var(--border)] bg-[var(--card)] p-6">
              <h3 className="text-lg font-semibold text-[var(--foreground)] mb-2">
                Category Advancement
              </h3>
              <p className="text-sm text-[var(--muted-foreground)]">
                Focused training plans and mentorship to help riders develop the
                skills needed to upgrade from Cat 5 through Cat 1.
              </p>
            </div>
            <div className="rounded-lg border border-[var(--border)] bg-[var(--card)] p-6">
              <h3 className="text-lg font-semibold text-[var(--foreground)] mb-2">
                Skills Clinics
              </h3>
              <p className="text-sm text-[var(--muted-foreground)]">
                Regular sessions covering cornering, sprinting, time trialing,
                and group riding tactics led by experienced racers and coaches.
              </p>
            </div>
          </div>
        </section>

        {/* How to Join */}
        <section className="mb-12">
          <div className="flex items-center gap-3 mb-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[var(--color-primary,#1e3a5f)]/10">
              <UserPlus className="h-5 w-5 text-[var(--color-primary,#1e3a5f)]" />
            </div>
            <h2 className="text-2xl font-semibold text-[var(--foreground)]">
              How to Join
            </h2>
          </div>
          <div className="max-w-3xl space-y-4">
            <p className="text-[var(--muted-foreground)] leading-relaxed">
              Joining the Development Academy is simple:
            </p>
            <ol className="list-decimal list-inside space-y-2 text-[var(--muted-foreground)]">
              <li>Create an account on our platform</li>
              <li>Register for a league membership</li>
              <li>Select the Academy program that matches your current level</li>
              <li>Attend orientation and meet your mentors</li>
            </ol>
            <p className="text-[var(--muted-foreground)] leading-relaxed">
              Academy enrollment is open year-round, and you can switch programs
              as your abilities grow.
            </p>
          </div>
        </section>

        {/* Benefits */}
        <section>
          <div className="flex items-center gap-3 mb-6">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[var(--color-primary,#1e3a5f)]/10">
              <Star className="h-5 w-5 text-[var(--color-primary,#1e3a5f)]" />
            </div>
            <h2 className="text-2xl font-semibold text-[var(--foreground)]">
              Benefits
            </h2>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 max-w-3xl">
            <div className="flex items-start gap-3">
              <div className="mt-1 h-2 w-2 rounded-full bg-[var(--color-primary,#1e3a5f)] flex-shrink-0" />
              <p className="text-[var(--muted-foreground)]">
                Personalized coaching and mentorship
              </p>
            </div>
            <div className="flex items-start gap-3">
              <div className="mt-1 h-2 w-2 rounded-full bg-[var(--color-primary,#1e3a5f)] flex-shrink-0" />
              <p className="text-[var(--muted-foreground)]">
                Structured progression pathway
              </p>
            </div>
            <div className="flex items-start gap-3">
              <div className="mt-1 h-2 w-2 rounded-full bg-[var(--color-primary,#1e3a5f)] flex-shrink-0" />
              <p className="text-[var(--muted-foreground)]">
                Access to group training rides
              </p>
            </div>
            <div className="flex items-start gap-3">
              <div className="mt-1 h-2 w-2 rounded-full bg-[var(--color-primary,#1e3a5f)] flex-shrink-0" />
              <p className="text-[var(--muted-foreground)]">
                Priority entry to league events
              </p>
            </div>
            <div className="flex items-start gap-3">
              <div className="mt-1 h-2 w-2 rounded-full bg-[var(--color-primary,#1e3a5f)] flex-shrink-0" />
              <p className="text-[var(--muted-foreground)]">
                Achievement tracking and progression badges
              </p>
            </div>
            <div className="flex items-start gap-3">
              <div className="mt-1 h-2 w-2 rounded-full bg-[var(--color-primary,#1e3a5f)] flex-shrink-0" />
              <p className="text-[var(--muted-foreground)]">
                Community of supportive fellow racers
              </p>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
