/**
 * BrandingService - Business logic for managing league branding configuration.
 * Reads and writes branding from the League document's embedded branding subdocument.
 * Handles retrieval, update, logo upload, and color validation.
 * Uses an in-memory cache with TTL (placeholder for Redis) for performance.
 *
 * Requirements: 11.1, 11.2, 11.3, 11.4, 19.1, 19.2, 19.3, 19.4, 19.5, 19.6, 19.7, 19.8, 19.9
 */

import { connectMongoDB } from "@/lib/db/mongodb";
import {
  LeagueModel,
  type LeagueDocument,
  type LeagueBrandingSubdoc,
} from "@/models/league.model";
import {
  BrandingConfigurationModel,
  type BrandingConfigurationDocument,
} from "@/models/branding.model";

/** Supported logo variants */
export type LogoVariant = "square" | "horizontal" | "vertical";

/** Supported image formats for logo upload */
const SUPPORTED_LOGO_FORMATS = ["image/png", "image/jpeg", "image/svg+xml", "image/webp"];

/** Valid logo variants */
const VALID_LOGO_VARIANTS: LogoVariant[] = ["square", "horizontal", "vertical"];

/** Hex color regex - must be #RRGGBB format */
const HEX_COLOR_REGEX = /^#([0-9A-Fa-f]{6})$/;

/** Cache TTL in milliseconds (5 minutes) */
const CACHE_TTL_MS = 5 * 60 * 1000;

/** In-memory cache entry (placeholder for Redis) */
interface CacheEntry {
  data: LeagueBrandingSubdoc;
  expiresAt: number;
}

/** Simple in-memory cache keyed by leagueId - will be replaced by Redis when available */
const brandingCache: Map<string, CacheEntry> = new Map();

/** Data for updating branding configuration */
export interface UpdateBrandingData {
  leagueName: string;
  logos: {
    square: string;
    horizontal: string;
    vertical: string;
  };
  mainColors: [string, string, string];
  accentColors: string[];
  updatedBy: string;
}

/** File-like object for logo upload */
export interface UploadFile {
  mimetype: string;
  originalname: string;
  buffer: Buffer;
}

export class BrandingService {
  /**
   * Get branding configuration for a specific league.
   * Returns from cache if available and not expired, otherwise fetches from League document.
   *
   * Requirement 11.1: Associate a Branding_Configuration with each League
   * Requirement 11.4: Apply branding of the league whose standings are displayed
   * Requirement 19.1: Display league name on Landing_Page, Navigation_Bar, and public pages
   * Requirement 19.5: Apply changes immediately without restart or redeployment
   */
  async get(leagueId: string): Promise<LeagueBrandingSubdoc | null> {
    // Check in-memory cache first
    const cached = brandingCache.get(leagueId);
    if (cached && cached.expiresAt > Date.now()) {
      return cached.data;
    }

    await connectMongoDB();

    const league = await LeagueModel.findById(leagueId).select("branding");

    if (league && league.branding) {
      // Update cache
      brandingCache.set(leagueId, {
        data: league.branding,
        expiresAt: Date.now() + CACHE_TTL_MS,
      });
      return league.branding;
    }

    return null;
  }

  /**
   * Update branding configuration for a specific league with validation.
   * Writes to the League document's embedded branding subdocument.
   * Validates exactly 3 main colors and 1-2 accent colors.
   * Invalidates cache after update.
   *
   * Requirement 11.2: Apply branding configuration to the Active_League_Context
   * Requirement 19.3: Store and apply 3 main colors to primary UI elements
   * Requirement 19.4: Store and apply 1-2 accent colors to secondary UI elements
   * Requirement 19.5: Apply change immediately (cache invalidation)
   * Requirement 19.6: Validate exactly 3 main colors
   * Requirement 19.7: Validate 1 or 2 accent colors
   */
  async update(leagueId: string, data: UpdateBrandingData): Promise<LeagueBrandingSubdoc> {
    await connectMongoDB();

    // Validate colors
    this.validateColors(data.mainColors, data.accentColors);

    // Validate all color formats
    for (const color of data.mainColors) {
      if (!HEX_COLOR_REGEX.test(color)) {
        throw new Error(
          `Invalid hex color format "${color}". Must be #RRGGBB format.`
        );
      }
    }
    for (const color of data.accentColors) {
      if (!HEX_COLOR_REGEX.test(color)) {
        throw new Error(
          `Invalid hex color format "${color}". Must be #RRGGBB format.`
        );
      }
    }

    // Validate league name
    if (!data.leagueName || data.leagueName.trim().length === 0) {
      throw new Error("League name is required");
    }

    // Validate logos - all three variants must be present
    if (!data.logos.square || !data.logos.horizontal || !data.logos.vertical) {
      throw new Error(
        "All three logo variants (square, horizontal, vertical) are required"
      );
    }

    const brandingData: LeagueBrandingSubdoc = {
      leagueName: data.leagueName.trim(),
      logos: data.logos,
      mainColors: data.mainColors,
      accentColors: data.accentColors,
    };

    // Update the League document's embedded branding subdocument
    const league = await LeagueModel.findByIdAndUpdate(
      leagueId,
      {
        $set: {
          branding: brandingData,
        },
      },
      { returnDocument: "after", runValidators: true }
    );

    if (!league) {
      throw new Error(`League with id "${leagueId}" not found`);
    }

    // Invalidate cache so next get() fetches fresh data
    brandingCache.delete(leagueId);

    return league.branding;
  }

  /**
   * @deprecated Use get(leagueId) instead. This method reads from the standalone branding collection
   * which is deprecated in favor of the League document's embedded branding subdocument.
   * Retained for backward compatibility during migration.
   */
  async getLegacy(): Promise<BrandingConfigurationDocument | null> {
    await connectMongoDB();
    return BrandingConfigurationModel.findOne();
  }

  /**
   * Upload a logo for a specific variant.
   * Validates the file format and variant name.
   * Returns a URL to the uploaded logo.
   *
   * Requirement 19.2: Accept three logo variants (square, horizontal, vertical)
   * Requirement 19.8: Reject uploads in unsupported formats
   * Requirement 19.9: Require all three logo variants
   *
   * Note: This is a stub implementation that returns a placeholder URL.
   * In production, this would upload to S3/Cloudinary.
   */
  async uploadLogo(variant: string, file: UploadFile): Promise<string> {
    // Validate variant
    if (!VALID_LOGO_VARIANTS.includes(variant as LogoVariant)) {
      throw new Error(
        `Invalid logo variant "${variant}". Must be one of: ${VALID_LOGO_VARIANTS.join(", ")}`
      );
    }

    // Validate file format
    if (!SUPPORTED_LOGO_FORMATS.includes(file.mimetype)) {
      throw new Error(
        `Unsupported logo format "${file.mimetype}". Accepted formats: ${SUPPORTED_LOGO_FORMATS.join(", ")}`
      );
    }

    // Validate file has content
    if (!file.buffer || file.buffer.length === 0) {
      throw new Error("Logo file is empty");
    }

    // Stub: In production, upload to S3/Cloudinary and return the actual URL
    const timestamp = Date.now();
    const extension = file.originalname.split(".").pop() || "png";
    const url = `https://cdn.example.com/logos/${variant}-${timestamp}.${extension}`;

    return url;
  }

  /**
   * Validate color counts for branding configuration.
   * Main colors must be exactly 3, accent colors must be 1 or 2.
   *
   * Requirement 19.6: Validate exactly 3 main colors
   * Requirement 19.7: Validate 1 or 2 accent colors
   */
  validateColors(
    mainColors: string[],
    accentColors: string[]
  ): boolean {
    if (!mainColors || mainColors.length !== 3) {
      throw new Error(
        `Exactly 3 main colors are required, but ${mainColors?.length ?? 0} provided`
      );
    }

    if (!accentColors || accentColors.length < 1 || accentColors.length > 2) {
      throw new Error(
        `1 or 2 accent colors are required, but ${accentColors?.length ?? 0} provided`
      );
    }

    return true;
  }

  /**
   * Clear the branding cache. Useful for testing.
   */
  clearCache(): void {
    brandingCache.clear();
  }
}
