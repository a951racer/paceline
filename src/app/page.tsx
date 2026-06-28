"use client";

import React, { useState, FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Trophy, TrendingUp, Users, Calendar, ChevronRight, Lock, User } from "lucide-react";
import { PublicLayout } from "@/components/layout/public-layout";
import { PublicFooter } from "@/components/layout/public-footer";

function GoogleIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" aria-hidden="true">
      <path
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
        fill="#4285F4"
      />
      <path
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
        fill="#34A853"
      />
      <path
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
        fill="#FBBC05"
      />
      <path
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
        fill="#EA4335"
      />
    </svg>
  );
}

function AppleIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M17.05 20.28c-.98.95-2.05.88-3.08.4-1.09-.5-2.08-.53-3.23 0-1.44.62-2.2.44-3.06-.4C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z" />
    </svg>
  );
}

const featureHighlights = [
  {
    icon: Trophy,
    title: "COMPETE",
    description: "Season standings, results and leaderboards.",
  },
  {
    icon: TrendingUp,
    title: "DEVELOP",
    description: "Academy, mentorship and track your progress.",
  },
  {
    icon: Users,
    title: "CONNECT",
    description: "Teams, community and race day experience.",
  },
  {
    icon: Calendar,
    title: "ORGANIZE",
    description: "Powerful tools for promoters and race directors.",
  },
];

export default function LandingPage() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  async function handleLogin(e: FormEvent) {
    e.preventDefault();
    setError("");
    setIsLoading(true);

    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      if (response.ok) {
        const data = await response.json();
        localStorage.setItem("accessToken", data.accessToken);
        localStorage.setItem("refreshToken", data.refreshToken);
        router.push("/dashboard");
      } else {
        const data = await response.json();
        setError(data.message || "Invalid email or password");
      }
    } catch {
      setError("An unexpected error occurred. Please try again.");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <PublicLayout footer={<PublicFooter />}>
      {/* Hero Section */}
      <section className="relative overflow-hidden bg-[#111214]">
        {/* Hero cyclist image — positioned center-top */}
        <div className="absolute inset-0">
          <img
            src="/images/hero-cyclists.png"
            alt="Cyclists racing in a paceline"
            className="mx-auto h-[500px] w-auto max-w-none object-cover object-top opacity-60"
          />
          {/* Gradient fade at bottom of image */}
          <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-[#111214]" />
        </div>

        {/* Dark overlay for readability */}
        <div className="absolute inset-0 bg-gradient-to-r from-[#111214]/80 via-[#111214]/40 to-[#111214]/80" />
        <div className="absolute inset-0 bg-gradient-to-t from-[#111214] via-[#111214]/20 to-transparent" />

        {/* Content */}
        <div className="relative mx-auto flex max-w-[1400px] flex-col gap-10 px-4 pb-12 pt-10 sm:px-6 lg:flex-row lg:items-start lg:justify-between lg:gap-24 lg:px-8 lg:pb-16 lg:pt-12">
          {/* Left side — Hero text + features */}
          <div className="flex-1 pt-4 lg:pt-6">
            {/* Hero heading — bold italic display */}
            <h1 className="font-extrabold italic leading-[0.9] tracking-tight">
              <span className="block text-4xl text-white sm:text-5xl lg:text-6xl">
                RACE TOGETHER.
              </span>
              <span className="mt-2 block text-4xl text-[#B87333] sm:text-5xl lg:text-6xl">
                GET FASTER.
              </span>
            </h1>

            {/* Subtitle */}
            <p className="mt-8 max-w-md text-[15px] leading-relaxed text-[#C5CBD3]">
              Paceline is the all-in-one platform for bicycle
              racers, teams, mentors and promoters.
            </p>

            {/* Feature list with left border */}
            <div className="mt-10 space-y-5 border-l-2 border-[#2E3038] pl-6">
              {featureHighlights.map((feature) => (
                <div key={feature.title} className="flex items-start gap-3">
                  <feature.icon className="mt-0.5 h-5 w-5 shrink-0 text-[#B87333]/80" />
                  <div>
                    <h3 className="text-sm font-bold tracking-wide text-white">
                      {feature.title}
                    </h3>
                    <p className="text-[13px] text-[#9CA3AF]">
                      {feature.description}
                    </p>
                  </div>
                </div>
              ))}
            </div>

            {/* CTA Buttons */}
            <div className="mt-10 flex flex-wrap gap-4">
              <Link
                href="/features"
                className="inline-flex items-center gap-2 rounded-lg bg-gradient-to-b from-[#D4915A] via-[#B87333] to-[#7A4A1E] px-6 py-3 text-sm font-bold uppercase tracking-wider text-white shadow-[inset_0_1px_1px_rgba(255,255,255,0.3),inset_0_-2px_3px_rgba(0,0,0,0.2),0_2px_6px_rgba(0,0,0,0.4)] transition-all hover:brightness-110 active:shadow-[inset_0_2px_4px_rgba(0,0,0,0.3),0_1px_2px_rgba(0,0,0,0.3)]"
              >
                Explore Features
                <ChevronRight className="h-4 w-4" />
              </Link>
              <Link
                href="/about"
                className="inline-flex items-center gap-2 rounded-md border border-[#C5CBD3]/30 bg-transparent px-6 py-3 text-sm font-bold uppercase tracking-wider text-white transition-all hover:border-[#C5CBD3]/60 hover:bg-white/5"
              >
                Learn More
                <ChevronRight className="h-4 w-4" />
              </Link>
            </div>
          </div>

          {/* Right side — Login Card */}
          <div className="w-full max-w-sm shrink-0 lg:mt-4">
            <div className="rounded-xl border border-[#2E3038] bg-[#1A1B1F] p-7 shadow-2xl">
              <h2 className="text-center text-xl font-bold text-white">
                WELCOME BACK
              </h2>
              <p className="mt-1 text-center text-sm text-[#9CA3AF]">
                Log in to your Paceline account
              </p>

              <form onSubmit={handleLogin} className="mt-6 space-y-4">
                <div>
                  <label
                    htmlFor="email"
                    className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-[#C5CBD3]"
                  >
                    Email
                  </label>
                  <div className="relative">
                    <input
                      id="email"
                      type="email"
                      autoComplete="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full rounded-md border border-[#2E3038] bg-[#111214] px-4 py-2.5 pr-10 text-sm text-white placeholder:text-[#6B7280] focus:border-[#B87333] focus:outline-none focus:ring-1 focus:ring-[#B87333]"
                      placeholder="you@domain.com"
                    />
                    <User className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#6B7280]" />
                  </div>
                </div>
                <div>
                  <label
                    htmlFor="password"
                    className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-[#C5CBD3]"
                  >
                    Password
                  </label>
                  <div className="relative">
                    <input
                      id="password"
                      type="password"
                      autoComplete="current-password"
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full rounded-md border border-[#2E3038] bg-[#111214] px-4 py-2.5 pr-10 text-sm text-white placeholder:text-[#6B7280] focus:border-[#B87333] focus:outline-none focus:ring-1 focus:ring-[#B87333]"
                      placeholder="Enter your password"
                    />
                    <Lock className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#6B7280]" />
                  </div>
                </div>

                <div className="flex items-center justify-end">
                  <Link
                    href="/forgot-password"
                    className="text-xs font-medium text-[#B87333] hover:text-[#D4915A]"
                  >
                    Forgot password?
                  </Link>
                </div>

                {error && (
                  <p className="text-sm text-red-400" role="alert">
                    {error}
                  </p>
                )}

                <button
                  type="submit"
                  disabled={isLoading}
                  className="flex w-full items-center justify-center gap-2 rounded-lg bg-gradient-to-b from-[#D4915A] via-[#B87333] to-[#7A4A1E] px-4 py-3 text-sm font-bold uppercase tracking-wider text-white shadow-[inset_0_1px_1px_rgba(255,255,255,0.3),inset_0_-2px_3px_rgba(0,0,0,0.2),0_2px_6px_rgba(0,0,0,0.4)] transition-all hover:brightness-110 active:shadow-[inset_0_2px_4px_rgba(0,0,0,0.3),0_1px_2px_rgba(0,0,0,0.3)] disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isLoading ? "Logging in..." : "LOG IN"}
                  {!isLoading && <ChevronRight className="h-4 w-4" />}
                </button>
              </form>

              {/* Divider */}
              <div className="relative my-6">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-[#2E3038]" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-[#1A1B1F] px-3 text-[#6B7280]">
                    Or
                  </span>
                </div>
              </div>

              {/* Social login buttons */}
              <div className="space-y-3">
                <button
                  type="button"
                  className="flex w-full items-center justify-center gap-3 rounded-md border border-[#2E3038] bg-[#111214] px-4 py-2.5 text-sm font-semibold text-white transition-all hover:border-[#B87333]/50 hover:bg-[#1E1F24]"
                  aria-label="Continue with Google"
                >
                  <GoogleIcon className="h-4 w-4" />
                  CONTINUE WITH GOOGLE
                </button>
                <button
                  type="button"
                  className="flex w-full items-center justify-center gap-3 rounded-md border border-[#2E3038] bg-[#111214] px-4 py-2.5 text-sm font-semibold text-white transition-all hover:border-[#B87333]/50 hover:bg-[#1E1F24]"
                  aria-label="Continue with Apple"
                >
                  <AppleIcon className="h-4 w-4" />
                  CONTINUE WITH APPLE
                </button>
              </div>

              <p className="mt-6 text-center text-sm text-[#9CA3AF]">
                New to Paceline?{" "}
                <Link
                  href="/register"
                  className="font-medium text-[#B87333] hover:text-[#D4915A]"
                >
                  Create an account
                </Link>
              </p>
            </div>
          </div>
        </div>
      </section>
    </PublicLayout>
  );
}
