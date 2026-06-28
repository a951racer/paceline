/**
 * Re-export useTheme hook from the ThemeProvider component.
 * This allows importing from either location:
 *   import { useTheme } from '@/components/theme-provider'
 *   import { useTheme } from '@/hooks/use-theme'
 */
export { useTheme } from "@/components/theme-provider";
export type { BrandingData, ThemeMode } from "@/components/theme-provider";
