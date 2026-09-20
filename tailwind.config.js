/** @type {import('tailwindcss').Config} */

// EbbaTrust design tokens — the single source of truth.
// Mirrored as typed constants in src/lib/theme/tokens.ts. The two must never diverge.
// See AGENTS.md §6.

module.exports = {
  content: ['./app/**/*.{js,jsx,ts,tsx}', './src/**/*.{js,jsx,ts,tsx}'],
  presets: [require('nativewind/preset')],
  theme: {
    extend: {
      colors: {
        // Brand — neutral action, no judgement implied
        brand: {
          50: '#E6F1FB',
          600: '#185FA5',
          900: '#0C447C',
        },
        // Verified — title valid, escrow funded, KYC passed
        verified: {
          50: '#E1F5EE',
          600: '#0F6E56',
        },
        // Caution — pending, unverified, awaiting registry or review
        caution: {
          50: '#FAEEDA',
          600: '#854F0B',
        },
        // Danger — title flagged, dispute, failed payment
        danger: {
          50: '#FCEBEB',
          600: '#A32D2D',
          900: '#7A2222',
        },
        // Text
        ink: {
          400: '#898781',
          600: '#5F5E5A',
          900: '#0B0B0B',
        },
        // Surfaces
        surface: {
          DEFAULT: '#FFFFFF',
          2: '#F1EFE8',
        },
        border: '#E3E1D9',
      },
      borderRadius: {
        md: '8px',
        lg: '12px',
        xl: '16px',
      },
      fontSize: {
        xs: '12px',
        sm: '14px',
        base: '16px',
        lg: '18px',
        xl: '24px',
        '2xl': '32px',
      },
    },
  },
  plugins: [],
};
