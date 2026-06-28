"use client";

import React, { useState } from "react";
import Link from "next/link";
import { Menu, X } from "lucide-react";
import { useTheme } from "@/hooks/use-theme";

const navLinks = [
  { label: "FEATURES", href: "/features" },
  { label: "LEAGUES", href: "/standings" },
  { label: "ABOUT", href: "/about" },
  { label: "CONTACT", href: "/contact" },
];

export function PublicNavBar() {
  const { branding } = useTheme();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const leagueName = branding?.leagueName ?? "Paceline";
  const logoUrl = branding?.logos?.horizontal;

  return (
    <nav className="w-full bg-[#111214] border-b border-[#2E3038]/50">
      <div className="mx-auto flex max-w-[1600px] items-center justify-between px-6 py-4 sm:px-10 lg:px-16">
        {/* Logo and league name */}
        <Link href="/" className="flex items-center">
          <img
            src={logoUrl || "/images/logo-horizontal.png"}
            alt={`${leagueName} logo`}
            className="h-8 w-auto"
          />
        </Link>

        {/* Desktop navigation links */}
        <div className="hidden items-center gap-8 md:flex">
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="text-[13px] font-medium tracking-[0.1em] text-[#C5CBD3] transition-colors hover:text-white"
            >
              {link.label}
            </Link>
          ))}
          <Link
            href="/contact?demo=true"
            className="rounded-md border border-[#B87333] px-5 py-2 text-[13px] font-semibold tracking-[0.05em] text-[#B87333] transition-all hover:bg-[#B87333] hover:text-white"
          >
            REQUEST A DEMO
          </Link>
        </div>

        {/* Mobile hamburger button */}
        <button
          type="button"
          className="inline-flex items-center justify-center rounded-md p-2 text-[#C5CBD3] md:hidden"
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          aria-expanded={mobileMenuOpen}
          aria-label={mobileMenuOpen ? "Close menu" : "Open menu"}
        >
          {mobileMenuOpen ? (
            <X className="h-6 w-6" />
          ) : (
            <Menu className="h-6 w-6" />
          )}
        </button>
      </div>

      {/* Mobile menu overlay */}
      {mobileMenuOpen && (
        <div className="border-t border-[#2E3038] bg-[#111214] md:hidden">
          <div className="flex flex-col gap-1 px-4 py-4">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="rounded-md px-3 py-2.5 text-sm font-medium tracking-wide text-[#C5CBD3] transition-colors hover:bg-[#1E1F24] hover:text-white"
                onClick={() => setMobileMenuOpen(false)}
              >
                {link.label}
              </Link>
            ))}
            <Link
              href="/contact?demo=true"
              className="mt-2 rounded-md border border-[#B87333] px-3 py-2.5 text-center text-sm font-semibold text-[#B87333] transition-all hover:bg-[#B87333] hover:text-white"
              onClick={() => setMobileMenuOpen(false)}
            >
              REQUEST A DEMO
            </Link>
          </div>
        </div>
      )}
    </nav>
  );
}
