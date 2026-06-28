"use client";

import React, { useState, FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ChevronRight, User, Lock, Mail } from "lucide-react";

function GoogleIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" aria-hidden="true">
      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
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

export default function RegisterPage() {
  const router = useRouter();

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  async function handleRegister(e: FormEvent) {
    e.preventDefault();
    setError("");

    if (password !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    if (password.length < 8) {
      setError("Password must be at least 8 characters");
      return;
    }

    setIsLoading(true);

    try {
      const response = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: { first: firstName, last: lastName },
          email,
          password,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        localStorage.setItem("accessToken", data.accessToken);
        localStorage.setItem("refreshToken", data.refreshToken);
        router.push("/dashboard");
      } else {
        const data = await response.json();
        setError(data.message || "Registration failed. Please try again.");
      }
    } catch {
      setError("An unexpected error occurred. Please try again.");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="flex min-h-[calc(100vh-65px)] items-center justify-center bg-[#111214] px-4 py-12">
      <div className="w-full max-w-md">
        <div className="rounded-xl border border-[#2E3038] bg-[#1A1B1F] p-8 shadow-2xl">
          <h1 className="text-center text-2xl font-bold text-white">
            CREATE ACCOUNT
          </h1>
          <p className="mt-2 text-center text-sm text-[#9CA3AF]">
            Join Paceline and start racing
          </p>

          <form onSubmit={handleRegister} className="mt-8 space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label
                  htmlFor="firstName"
                  className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-[#C5CBD3]"
                >
                  First Name
                </label>
                <div className="relative">
                  <input
                    id="firstName"
                    type="text"
                    autoComplete="given-name"
                    required
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    className="w-full rounded-md border border-[#2E3038] bg-[#111214] px-4 py-2.5 pr-10 text-sm text-white placeholder:text-[#6B7280] focus:border-[#B87333] focus:outline-none focus:ring-1 focus:ring-[#B87333]"
                    placeholder="First"
                  />
                  <User className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#6B7280]" />
                </div>
              </div>
              <div>
                <label
                  htmlFor="lastName"
                  className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-[#C5CBD3]"
                >
                  Last Name
                </label>
                <input
                  id="lastName"
                  type="text"
                  autoComplete="family-name"
                  required
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  className="w-full rounded-md border border-[#2E3038] bg-[#111214] px-4 py-2.5 text-sm text-white placeholder:text-[#6B7280] focus:border-[#B87333] focus:outline-none focus:ring-1 focus:ring-[#B87333]"
                  placeholder="Last"
                />
              </div>
            </div>

            <div>
              <label
                htmlFor="register-email"
                className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-[#C5CBD3]"
              >
                Email
              </label>
              <div className="relative">
                <input
                  id="register-email"
                  type="email"
                  autoComplete="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full rounded-md border border-[#2E3038] bg-[#111214] px-4 py-2.5 pr-10 text-sm text-white placeholder:text-[#6B7280] focus:border-[#B87333] focus:outline-none focus:ring-1 focus:ring-[#B87333]"
                  placeholder="you@domain.com"
                />
                <Mail className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#6B7280]" />
              </div>
            </div>

            <div>
              <label
                htmlFor="register-password"
                className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-[#C5CBD3]"
              >
                Password
              </label>
              <div className="relative">
                <input
                  id="register-password"
                  type="password"
                  autoComplete="new-password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full rounded-md border border-[#2E3038] bg-[#111214] px-4 py-2.5 pr-10 text-sm text-white placeholder:text-[#6B7280] focus:border-[#B87333] focus:outline-none focus:ring-1 focus:ring-[#B87333]"
                  placeholder="At least 8 characters"
                />
                <Lock className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#6B7280]" />
              </div>
            </div>

            <div>
              <label
                htmlFor="confirm-password"
                className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-[#C5CBD3]"
              >
                Confirm Password
              </label>
              <div className="relative">
                <input
                  id="confirm-password"
                  type="password"
                  autoComplete="new-password"
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full rounded-md border border-[#2E3038] bg-[#111214] px-4 py-2.5 pr-10 text-sm text-white placeholder:text-[#6B7280] focus:border-[#B87333] focus:outline-none focus:ring-1 focus:ring-[#B87333]"
                  placeholder="Re-enter your password"
                />
                <Lock className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#6B7280]" />
              </div>
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
              {isLoading ? "Creating account..." : "CREATE ACCOUNT"}
              {!isLoading && <ChevronRight className="h-4 w-4" />}
            </button>
          </form>

          {/* Divider */}
          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-[#2E3038]" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-[#1A1B1F] px-3 text-[#6B7280]">Or</span>
            </div>
          </div>

          {/* Social signup */}
          <div className="space-y-3">
            <button
              type="button"
              className="flex w-full items-center justify-center gap-3 rounded-md border border-[#2E3038] bg-[#111214] px-4 py-2.5 text-sm font-semibold text-white transition-all hover:border-[#B87333]/50 hover:bg-[#1E1F24]"
              aria-label="Sign up with Google"
            >
              <GoogleIcon className="h-4 w-4" />
              SIGN UP WITH GOOGLE
            </button>
            <button
              type="button"
              className="flex w-full items-center justify-center gap-3 rounded-md border border-[#2E3038] bg-[#111214] px-4 py-2.5 text-sm font-semibold text-white transition-all hover:border-[#B87333]/50 hover:bg-[#1E1F24]"
              aria-label="Sign up with Apple"
            >
              <AppleIcon className="h-4 w-4" />
              SIGN UP WITH APPLE
            </button>
          </div>

          <p className="mt-6 text-center text-sm text-[#9CA3AF]">
            Already have an account?{" "}
            <Link
              href="/"
              className="font-medium text-[#B87333] hover:text-[#D4915A]"
            >
              Log in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
