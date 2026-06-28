"use client";

import React from "react";
import Link from "next/link";
import { useTheme } from "@/hooks/use-theme";

const valuePropositions = [
  {
    icon: "/images/icon-built-for-racers.png",
    label: "BUILT FOR RACERS",
    description: "From first-time racers to seasoned competitors.",
  },
  {
    icon: "/images/icon-stronger-together.png",
    label: "STRONGER TOGETHER",
    description: "Teams, mentors and a community that drives you forward.",
  },
  {
    icon: "/images/icon-every-race-counts.png",
    label: "EVERY RACE COUNTS",
    description: "Points, achievements and season-long competition.",
  },
  {
    icon: "/images/icon-all-in-one-place.png",
    label: "ALL IN ONE PLACE",
    description: "Everything you need to race, track and improve.",
  },
];

const footerLinks = [
  { label: "Privacy Policy", href: "/privacy" },
  { label: "Terms of Service", href: "/terms" },
  { label: "Support", href: "/support" },
];

function InstagramIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z" />
    </svg>
  );
}

function FacebookIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
    </svg>
  );
}

function XIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
    </svg>
  );
}

export function PublicFooter() {
  const { branding } = useTheme();
  const leagueName = branding?.leagueName ?? "Paceline";
  const currentYear = new Date().getFullYear();

  return (
    <footer className="w-full">
      {/* Value Propositions Section */}
      <div className="border-t border-[#2E3038] bg-[#1A1B1F]">
        <div className="mx-auto grid max-w-7xl grid-cols-1 gap-8 px-4 py-10 sm:grid-cols-2 sm:px-6 lg:grid-cols-4 lg:px-8">
          {valuePropositions.map((prop) => (
            <div
              key={prop.label}
              className="flex items-start gap-4"
            >
              <img
                src={prop.icon}
                alt={prop.label}
                className="h-10 w-10 shrink-0 object-contain"
              />
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-white">
                  {prop.label}
                </h4>
                <p className="mt-0.5 text-xs text-[#9CA3AF]">
                  {prop.description}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Copyright Footer */}
      <div className="border-t border-[#2E3038] bg-[#111214]">
        <div className="mx-auto flex max-w-7xl flex-col items-center gap-4 px-4 py-6 sm:flex-row sm:justify-between sm:px-6 lg:px-8">
          <p className="text-xs text-[#6B7280]">
            &copy; {currentYear} {leagueName}. All rights reserved.
          </p>

          <nav aria-label="Footer navigation" className="flex items-center gap-6">
            {footerLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="text-xs text-[#6B7280] transition-colors hover:text-[#C5CBD3]"
              >
                {link.label}
              </Link>
            ))}
          </nav>

          <div className="flex items-center gap-4">
            <a href="#" aria-label="Instagram" className="text-[#6B7280] transition-colors hover:text-[#C5CBD3]">
              <InstagramIcon className="h-4 w-4" />
            </a>
            <a href="#" aria-label="Facebook" className="text-[#6B7280] transition-colors hover:text-[#C5CBD3]">
              <FacebookIcon className="h-4 w-4" />
            </a>
            <a href="#" aria-label="X" className="text-[#6B7280] transition-colors hover:text-[#C5CBD3]">
              <XIcon className="h-4 w-4" />
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}
