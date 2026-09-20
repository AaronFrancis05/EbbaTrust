/**
 * EbbaTrust design tokens — typed mirror of `tailwind.config.js`.
 *
 * Use Tailwind/NativeWind classes in components wherever possible. These constants exist
 * for the places classes cannot reach: native APIs that need a raw colour value, such as
 * StatusBar, map polygon strokes, chart fills and navigation theming.
 *
 * ⚠ If you change a value here, change `tailwind.config.js` in the same commit.
 *   The two files must never diverge. See AGENTS.md §6.
 */

export const colors = {
  brand: { 50: '#E6F1FB', 600: '#185FA5', 900: '#0C447C' },
  verified: { 50: '#E1F5EE', 600: '#0F6E56' },
  caution: { 50: '#FAEEDA', 600: '#854F0B' },
  danger: { 50: '#FCEBEB', 600: '#A32D2D', 900: '#7A2222' },
  ink: { 400: '#898781', 600: '#5F5E5A', 900: '#0B0B0B' },
  surface: { DEFAULT: '#FFFFFF', 2: '#F1EFE8' },
  border: '#E3E1D9',
} as const;

export const spacing = { 1: 4, 2: 8, 3: 12, 4: 16, 6: 24, 8: 32, 12: 48 } as const;

export const radius = { md: 8, lg: 12, xl: 16, full: 9999 } as const;

export const fontSize = { xs: 12, sm: 14, base: 16, lg: 18, xl: 24, '2xl': 32 } as const;

export const fontWeight = { regular: '400', medium: '500', semibold: '600' } as const;

/** Minimum touch target. Users are often outdoors on a mid-range phone. AGENTS.md §5.5 */
export const MIN_TAP_TARGET = 44;

/**
 * Verification status semantics — fixed across the whole app.
 *
 * A user learns these colours in their first session and will trust them with a land
 * purchase, so they must never be reinterpreted or reused decoratively.
 *
 * Colour is never the only signal: every status pairs surface + text + icon + label.
 * Users may be colour-blind, and they are often reading this in direct sunlight while
 * standing on the land in question. AGENTS.md §5.5.
 */
export const statusTokens = {
  verified: {
    surface: colors.verified[50],
    content: colors.verified[600],
    label: 'Verified',
    icon: 'shield-check',
  },
  pending: {
    surface: colors.caution[50],
    content: colors.caution[600],
    label: 'Pending',
    icon: 'clock',
  },
  flagged: {
    surface: colors.danger[50],
    content: colors.danger[600],
    label: 'Flagged',
    icon: 'alert-triangle',
  },
  neutral: {
    surface: colors.brand[50],
    content: colors.brand[600],
    label: 'Info',
    icon: 'info',
  },
} as const;

export type VerificationStatus = keyof typeof statusTokens;
