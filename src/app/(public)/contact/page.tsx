"use client";

import React, { useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { Mail, Phone, Send } from "lucide-react";

export default function ContactPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[var(--background)]" />}>
      <ContactPageContent />
    </Suspense>
  );
}

function ContactPageContent() {
  const searchParams = useSearchParams();
  const isDemo = searchParams.get("demo") === "true";

  const [formData, setFormData] = useState({
    name: "",
    email: "",
    subject: isDemo ? "Request a Demo" : "",
    message: "",
  });

  function handleChange(
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    // Form submission placeholder — no backend wired
  }

  return (
    <div className="min-h-screen bg-[var(--background)]">
      {/* Page Header */}
      <div className="border-b border-[var(--border)] bg-gradient-to-r from-[var(--color-primary,#1e3a5f)] to-[var(--color-secondary,#2d5a87)]">
        <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
          <h1 className="text-3xl font-bold text-white sm:text-4xl">
            Contact Us
          </h1>
          <p className="mt-2 text-white/70">
            {isDemo
              ? "Request a demo to see the platform in action"
              : "Get in touch with our team"}
          </p>
        </div>
      </div>

      {/* Content */}
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="grid gap-12 lg:grid-cols-3">
          {/* Contact Form */}
          <div className="lg:col-span-2">
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid gap-6 sm:grid-cols-2">
                <div>
                  <label
                    htmlFor="name"
                    className="mb-1 block text-sm font-medium text-[var(--foreground)]"
                  >
                    Name
                  </label>
                  <input
                    type="text"
                    id="name"
                    name="name"
                    value={formData.name}
                    onChange={handleChange}
                    required
                    className="w-full rounded-md border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-sm text-[var(--foreground)] placeholder:text-[var(--muted-foreground)] focus:border-[var(--color-primary,#1e3a5f)] focus:outline-none focus:ring-1 focus:ring-[var(--color-primary,#1e3a5f)]"
                    placeholder="Your name"
                  />
                </div>
                <div>
                  <label
                    htmlFor="email"
                    className="mb-1 block text-sm font-medium text-[var(--foreground)]"
                  >
                    Email
                  </label>
                  <input
                    type="email"
                    id="email"
                    name="email"
                    value={formData.email}
                    onChange={handleChange}
                    required
                    className="w-full rounded-md border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-sm text-[var(--foreground)] placeholder:text-[var(--muted-foreground)] focus:border-[var(--color-primary,#1e3a5f)] focus:outline-none focus:ring-1 focus:ring-[var(--color-primary,#1e3a5f)]"
                    placeholder="you@example.com"
                  />
                </div>
              </div>

              <div>
                <label
                  htmlFor="subject"
                  className="mb-1 block text-sm font-medium text-[var(--foreground)]"
                >
                  Subject
                </label>
                <input
                  type="text"
                  id="subject"
                  name="subject"
                  value={formData.subject}
                  onChange={handleChange}
                  required
                  className="w-full rounded-md border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-sm text-[var(--foreground)] placeholder:text-[var(--muted-foreground)] focus:border-[var(--color-primary,#1e3a5f)] focus:outline-none focus:ring-1 focus:ring-[var(--color-primary,#1e3a5f)]"
                  placeholder="How can we help?"
                />
              </div>

              <div>
                <label
                  htmlFor="message"
                  className="mb-1 block text-sm font-medium text-[var(--foreground)]"
                >
                  Message
                </label>
                <textarea
                  id="message"
                  name="message"
                  value={formData.message}
                  onChange={handleChange}
                  required
                  rows={6}
                  className="w-full rounded-md border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-sm text-[var(--foreground)] placeholder:text-[var(--muted-foreground)] focus:border-[var(--color-primary,#1e3a5f)] focus:outline-none focus:ring-1 focus:ring-[var(--color-primary,#1e3a5f)]"
                  placeholder="Tell us more about your inquiry..."
                />
              </div>

              <button
                type="submit"
                className="inline-flex items-center gap-2 rounded-md bg-[var(--color-primary,#1e3a5f)] px-6 py-2.5 text-sm font-semibold text-white transition-opacity hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-[var(--color-primary,#1e3a5f)] focus:ring-offset-2"
              >
                <Send className="h-4 w-4" />
                Send Message
              </button>
            </form>
          </div>

          {/* Contact Info Sidebar */}
          <aside className="space-y-8">
            <div>
              <h2 className="mb-4 text-lg font-semibold text-[var(--foreground)]">
                Contact Information
              </h2>
              <div className="space-y-4">
                <div className="flex items-start gap-3">
                  <Mail className="mt-0.5 h-5 w-5 text-[var(--color-primary,#1e3a5f)]" />
                  <div>
                    <p className="text-sm font-medium text-[var(--foreground)]">
                      Email
                    </p>
                    <p className="text-sm text-[var(--muted-foreground)]">
                      info@bikeracingleague.com
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <Phone className="mt-0.5 h-5 w-5 text-[var(--color-primary,#1e3a5f)]" />
                  <div>
                    <p className="text-sm font-medium text-[var(--foreground)]">
                      Phone
                    </p>
                    <p className="text-sm text-[var(--muted-foreground)]">
                      (555) 123-4567
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div>
              <h2 className="mb-4 text-lg font-semibold text-[var(--foreground)]">
                Office Hours
              </h2>
              <p className="text-sm text-[var(--muted-foreground)]">
                Monday – Friday: 9:00 AM – 5:00 PM
              </p>
              <p className="text-sm text-[var(--muted-foreground)]">
                Saturday – Sunday: Closed
              </p>
            </div>

            <div>
              <h2 className="mb-4 text-lg font-semibold text-[var(--foreground)]">
                Follow Us
              </h2>
              <div className="flex gap-4">
                <a
                  href="#"
                  className="text-sm text-[var(--muted-foreground)] transition-colors hover:text-[var(--color-primary,#1e3a5f)]"
                  aria-label="Facebook"
                >
                  Facebook
                </a>
                <a
                  href="#"
                  className="text-sm text-[var(--muted-foreground)] transition-colors hover:text-[var(--color-primary,#1e3a5f)]"
                  aria-label="Instagram"
                >
                  Instagram
                </a>
                <a
                  href="#"
                  className="text-sm text-[var(--muted-foreground)] transition-colors hover:text-[var(--color-primary,#1e3a5f)]"
                  aria-label="Twitter"
                >
                  Twitter
                </a>
              </div>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}
