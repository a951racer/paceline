"use client";

import React, { useEffect, useState } from "react";
import { Palette, Save } from "lucide-react";
import { adminFetch } from "@/lib/admin-fetch";

interface BrandingConfig {
  leagueName: string;
  logos: {
    square: string;
    horizontal: string;
    vertical: string;
  };
  mainColors: [string, string, string];
  accentColors: [string] | [string, string];
}

export default function AdminBrandingPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [formData, setFormData] = useState<BrandingConfig>({
    leagueName: "",
    logos: { square: "", horizontal: "", vertical: "" },
    mainColors: ["#3b82f6", "#1e40af", "#60a5fa"],
    accentColors: ["#f59e0b", "#10b981"],
  });

  const [useSecondAccent, setUseSecondAccent] = useState(true);

  useEffect(() => {
    const fetchBranding = async () => {
      try {
        const res = await fetch("/api/branding");
        if (res.ok) {
          const json = await res.json();
          if (json.data) {
            setFormData({
              leagueName: json.data.leagueName || "",
              logos: json.data.logos || { square: "", horizontal: "", vertical: "" },
              mainColors: json.data.mainColors || ["#3b82f6", "#1e40af", "#60a5fa"],
              accentColors: json.data.accentColors || ["#f59e0b"],
            });
            setUseSecondAccent((json.data.accentColors?.length || 0) > 1);
          }
        }
      } catch {
        // Use defaults
      } finally {
        setLoading(false);
      }
    };
    fetchBranding();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setSuccess(null);

    const payload = {
      leagueName: formData.leagueName,
      logos: formData.logos,
      mainColors: formData.mainColors,
      accentColors: useSecondAccent
        ? formData.accentColors
        : [formData.accentColors[0]],
    };

    try {
      const res = await adminFetch("/api/admin/branding", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const json = await res.json();
        throw new Error(json.message || "Failed to update branding");
      }

      setSuccess("Branding updated successfully!");
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-[var(--color-primary,#3b82f6)] border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="p-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <Palette className="h-6 w-6 text-[var(--color-primary,#3b82f6)]" />
        <h1 className="text-2xl font-bold text-[var(--foreground)]">Branding</h1>
      </div>

      {error && (
        <div className="mb-4 rounded-md bg-red-50 border border-red-200 p-3 text-sm text-red-700">
          {error}
        </div>
      )}
      {success && (
        <div className="mb-4 rounded-md bg-green-50 border border-green-200 p-3 text-sm text-green-700">
          {success}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-6">
        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* League Name */}
          <div className="rounded-lg border border-[var(--border)] p-4">
            <h2 className="text-sm font-semibold mb-3">League Name</h2>
            <input
              type="text"
              required
              value={formData.leagueName}
              onChange={(e) => setFormData((p) => ({ ...p, leagueName: e.target.value }))}
              className="w-full rounded-md border border-[var(--border)] px-3 py-2 text-sm"
              placeholder="My Racing League"
            />
          </div>

          {/* Main Colors */}
          <div className="rounded-lg border border-[var(--border)] p-4">
            <h2 className="text-sm font-semibold mb-3">Main Colors (exactly 3)</h2>
            <div className="grid grid-cols-3 gap-4">
              {formData.mainColors.map((color, i) => (
                <div key={i}>
                  <label className="block text-xs text-[var(--muted-foreground,#6b7280)] mb-1">
                    Color {i + 1}
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={color}
                      onChange={(e) => {
                        const newColors = [...formData.mainColors] as [string, string, string];
                        newColors[i] = e.target.value;
                        setFormData((p) => ({ ...p, mainColors: newColors }));
                      }}
                      className="h-10 w-10 rounded border border-[var(--border)] cursor-pointer"
                    />
                    <input
                      type="text"
                      value={color}
                      onChange={(e) => {
                        const newColors = [...formData.mainColors] as [string, string, string];
                        newColors[i] = e.target.value;
                        setFormData((p) => ({ ...p, mainColors: newColors }));
                      }}
                      className="flex-1 rounded-md border border-[var(--border)] px-2 py-1.5 text-sm font-mono"
                      pattern="^#[0-9a-fA-F]{6}$"
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Accent Colors */}
          <div className="rounded-lg border border-[var(--border)] p-4">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-semibold">Accent Colors (1-2)</h2>
              <label className="flex items-center gap-2 text-xs">
                <input
                  type="checkbox"
                  checked={useSecondAccent}
                  onChange={(e) => setUseSecondAccent(e.target.checked)}
                  className="rounded"
                />
                Use second accent
              </label>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs text-[var(--muted-foreground,#6b7280)] mb-1">
                  Accent 1
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={formData.accentColors[0]}
                    onChange={(e) => {
                      const newColors = [...formData.accentColors];
                      newColors[0] = e.target.value;
                      setFormData((p) => ({ ...p, accentColors: newColors as [string] | [string, string] }));
                    }}
                    className="h-10 w-10 rounded border border-[var(--border)] cursor-pointer"
                  />
                  <input
                    type="text"
                    value={formData.accentColors[0]}
                    onChange={(e) => {
                      const newColors = [...formData.accentColors];
                      newColors[0] = e.target.value;
                      setFormData((p) => ({ ...p, accentColors: newColors as [string] | [string, string] }));
                    }}
                    className="flex-1 rounded-md border border-[var(--border)] px-2 py-1.5 text-sm font-mono"
                  />
                </div>
              </div>
              {useSecondAccent && (
                <div>
                  <label className="block text-xs text-[var(--muted-foreground,#6b7280)] mb-1">
                    Accent 2
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={formData.accentColors[1] || "#10b981"}
                      onChange={(e) => {
                        const newColors = [formData.accentColors[0], e.target.value] as [string, string];
                        setFormData((p) => ({ ...p, accentColors: newColors }));
                      }}
                      className="h-10 w-10 rounded border border-[var(--border)] cursor-pointer"
                    />
                    <input
                      type="text"
                      value={formData.accentColors[1] || "#10b981"}
                      onChange={(e) => {
                        const newColors = [formData.accentColors[0], e.target.value] as [string, string];
                        setFormData((p) => ({ ...p, accentColors: newColors }));
                      }}
                      className="flex-1 rounded-md border border-[var(--border)] px-2 py-1.5 text-sm font-mono"
                    />
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Logos */}
          <div className="rounded-lg border border-[var(--border)] p-4">
            <h2 className="text-sm font-semibold mb-3">Logo URLs (3 variants)</h2>
            <div className="space-y-3">
              <div>
                <label className="block text-xs text-[var(--muted-foreground,#6b7280)] mb-1">
                  Square Logo
                </label>
                <input
                  type="text"
                  value={formData.logos.square}
                  onChange={(e) => setFormData((p) => ({ ...p, logos: { ...p.logos, square: e.target.value } }))}
                  placeholder="https://example.com/logo-square.png"
                  className="w-full rounded-md border border-[var(--border)] px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="block text-xs text-[var(--muted-foreground,#6b7280)] mb-1">
                  Horizontal Logo
                </label>
                <input
                  type="text"
                  value={formData.logos.horizontal}
                  onChange={(e) => setFormData((p) => ({ ...p, logos: { ...p.logos, horizontal: e.target.value } }))}
                  placeholder="https://example.com/logo-horizontal.png"
                  className="w-full rounded-md border border-[var(--border)] px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="block text-xs text-[var(--muted-foreground,#6b7280)] mb-1">
                  Vertical Logo
                </label>
                <input
                  type="text"
                  value={formData.logos.vertical}
                  onChange={(e) => setFormData((p) => ({ ...p, logos: { ...p.logos, vertical: e.target.value } }))}
                  placeholder="https://example.com/logo-vertical.png"
                  className="w-full rounded-md border border-[var(--border)] px-3 py-2 text-sm"
                />
              </div>
            </div>
          </div>

          <button
            type="submit"
            disabled={saving}
            className="flex items-center gap-2 rounded-md bg-[var(--color-primary,#3b82f6)] px-6 py-2.5 text-sm font-medium text-white hover:opacity-90 disabled:opacity-50 transition-opacity"
          >
            <Save className="h-4 w-4" />
            {saving ? "Saving..." : "Save Branding"}
          </button>
        </form>

        {/* Live Preview */}
        <div className="space-y-4">
          <div className="rounded-lg border border-[var(--border)] p-4 sticky top-6">
            <h2 className="text-sm font-semibold mb-3">Live Preview</h2>

            {/* Color Swatches */}
            <div className="mb-4">
              <p className="text-xs text-[var(--muted-foreground,#6b7280)] mb-2">Main Colors</p>
              <div className="flex gap-2">
                {formData.mainColors.map((color, i) => (
                  <div
                    key={i}
                    className="h-12 w-12 rounded-lg border border-[var(--border)] shadow-sm"
                    style={{ backgroundColor: color }}
                    title={color}
                  />
                ))}
              </div>
            </div>

            <div className="mb-4">
              <p className="text-xs text-[var(--muted-foreground,#6b7280)] mb-2">Accent Colors</p>
              <div className="flex gap-2">
                <div
                  className="h-12 w-12 rounded-lg border border-[var(--border)] shadow-sm"
                  style={{ backgroundColor: formData.accentColors[0] }}
                  title={formData.accentColors[0]}
                />
                {useSecondAccent && formData.accentColors[1] && (
                  <div
                    className="h-12 w-12 rounded-lg border border-[var(--border)] shadow-sm"
                    style={{ backgroundColor: formData.accentColors[1] }}
                    title={formData.accentColors[1]}
                  />
                )}
              </div>
            </div>

            {/* Mini Preview */}
            <div className="rounded-lg overflow-hidden border border-[var(--border)]">
              <div
                className="h-10 flex items-center px-3"
                style={{ backgroundColor: formData.mainColors[0] }}
              >
                <span className="text-white text-xs font-semibold truncate">
                  {formData.leagueName || "League Name"}
                </span>
              </div>
              <div className="p-3 bg-white">
                <div
                  className="h-2 w-3/4 rounded mb-2"
                  style={{ backgroundColor: formData.mainColors[1] }}
                />
                <div
                  className="h-2 w-1/2 rounded mb-3"
                  style={{ backgroundColor: formData.mainColors[2] }}
                />
                <div className="flex gap-2">
                  <div
                    className="h-6 px-3 rounded flex items-center"
                    style={{ backgroundColor: formData.accentColors[0] }}
                  >
                    <span className="text-white text-[10px] font-medium">Button</span>
                  </div>
                  {useSecondAccent && formData.accentColors[1] && (
                    <div
                      className="h-6 px-3 rounded flex items-center"
                      style={{ backgroundColor: formData.accentColors[1] }}
                    >
                      <span className="text-white text-[10px] font-medium">Link</span>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Logo Previews */}
            {(formData.logos.square || formData.logos.horizontal || formData.logos.vertical) && (
              <div className="mt-4">
                <p className="text-xs text-[var(--muted-foreground,#6b7280)] mb-2">Logos</p>
                <div className="space-y-2">
                  {formData.logos.square && (
                    <img src={formData.logos.square} alt="Square" className="h-8 w-8 rounded object-contain border border-[var(--border)]" />
                  )}
                  {formData.logos.horizontal && (
                    <img src={formData.logos.horizontal} alt="Horizontal" className="h-8 max-w-[120px] rounded object-contain border border-[var(--border)]" />
                  )}
                  {formData.logos.vertical && (
                    <img src={formData.logos.vertical} alt="Vertical" className="h-16 rounded object-contain border border-[var(--border)]" />
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
