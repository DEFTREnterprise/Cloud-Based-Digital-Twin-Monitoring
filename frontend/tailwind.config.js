/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  // Dinamik sınıfların derlenmesi için safelist
  safelist: [
    // Primary renkleri
    'bg-primary-50', 'bg-primary-100', 'bg-primary-200', 'bg-primary-300', 'bg-primary-400', 'bg-primary-500',
    'text-primary-50', 'text-primary-100', 'text-primary-200', 'text-primary-300', 'text-primary-400', 'text-primary-500', 'text-primary-600', 'text-primary-700', 'text-primary-800', 'text-primary-900',
    'border-primary-100', 'border-primary-200', 'border-primary-300', 'border-primary-400', 'border-primary-500',
    'border-l-primary-500', 'border-l-primary-400',
    'hover:border-primary-300', 'hover:border-primary-400',

    // Secondary renkleri
    'bg-secondary-50', 'bg-secondary-100', 'bg-secondary-200', 'bg-secondary-300', 'bg-secondary-400', 'bg-secondary-500',
    'text-secondary-400', 'text-secondary-500', 'text-secondary-600', 'text-secondary-700',
    'border-secondary-200', 'border-secondary-300',
    'border-l-secondary-500', 'border-l-secondary-400',

    // Neutral renkleri
    'bg-neutral-50', 'bg-neutral-100', 'bg-neutral-200', 'bg-neutral-300',
    'text-neutral-400', 'text-neutral-500', 'text-neutral-600', 'text-neutral-700', 'text-neutral-800', 'text-neutral-900',
    'border-neutral-100', 'border-neutral-200', 'border-neutral-300',
    'border-l-neutral-300', 'border-l-neutral-400',
    'hover:border-neutral-300',

    // Success renkleri
    'bg-success-50', 'bg-success-100', 'bg-success-200',
    'text-success-500', 'text-success-600', 'text-success-700',
    'border-success-200', 'border-success-300', 'border-success-500',
    'border-l-success-500', 'border-l-success-400',
    'hover:border-success-300',
    'border-success-200/60',

    // Warning renkleri
    'bg-warning-50', 'bg-warning-100', 'bg-warning-200',
    'text-warning-500', 'text-warning-600', 'text-warning-700',
    'border-warning-200', 'border-warning-300', 'border-warning-500',
    'border-l-warning-500', 'border-l-warning-400',
    'hover:border-warning-300',
    'border-warning-200/60',

    // Error renkleri
    'bg-error-50', 'bg-error-100', 'bg-error-200',
    'text-error-500', 'text-error-600', 'text-error-700', 'text-error-800',
    'border-error-200', 'border-error-300', 'border-error-500',
    'border-l-error-500', 'border-l-error-400',
    'hover:border-error-300',
    'border-error-200/60',

    // Opacity variants
    'border-neutral-200/50',

    // Shadows
    'shadow-soft', 'shadow-soft-md', 'shadow-soft-lg',
    'hover:shadow-soft-md',
  ],
  theme: {
    extend: {
      colors: {
        // ═══════════════════════════════════════════════════════════
        // MATISSE RENK PALETİ
        // Ana marka renkleri: #2060CD, #19A7CE, #FFFFFF
        // ═══════════════════════════════════════════════════════════

        // Primary - Ana Mavi (#2060CD bazlı)
        primary: {
          50: '#F0F5FC',
          100: '#E0EBFA',
          200: '#B8D1F5',
          300: '#8AB4EE',
          400: '#5C94E5',
          500: '#2060CD',   // ✨ Ana marka rengi
          600: '#1A50A8',
          700: '#153F84',
          800: '#102F60',
          900: '#0A1F3D',
        },

        // Secondary - Turkuaz Mavi (#19A7CE bazlı)
        secondary: {
          50: '#EDF8FB',
          100: '#D9F1F7',
          200: '#B3E3EE',
          300: '#7ACFE2',
          400: '#19A7CE',   // ✨ İkinci marka rengi
          500: '#1591B4',
          600: '#117A99',
          700: '#0D647E',
          800: '#094D63',
          900: '#053748',
        },

        // Neutral - Nötr Tonlar (Mavi alt tonlu griler)
        neutral: {
          50: '#F8FAFC',
          100: '#F1F5F9',
          200: '#E2E8F0',
          300: '#CBD5E1',
          400: '#94A3B8',
          500: '#64748B',
          600: '#475569',
          700: '#334155',
          800: '#1E293B',
          900: '#0F172A',
        },

        // ═══════════════════════════════════════════════════════════
        // SEMANTİK RENKLER (Soft / Muted)
        // ═══════════════════════════════════════════════════════════

        // Success - Soft yeşil
        success: {
          50: '#ECFDF5',
          100: '#D1FAE5',
          200: '#A7F3D0',
          300: '#6EE7B7',
          400: '#34D399',
          500: '#10B981',
          600: '#059669',
          700: '#047857',
        },

        // Warning - Soft amber
        warning: {
          50: '#FFFBEB',
          100: '#FEF3C7',
          200: '#FDE68A',
          300: '#FCD34D',
          400: '#FBBF24',
          500: '#F59E0B',
          600: '#D97706',
          700: '#B45309',
        },

        // Error/Critical - Soft kırmızı
        error: {
          50: '#FEF2F2',
          100: '#FEE2E2',
          200: '#FECACA',
          300: '#FCA5A5',
          400: '#F87171',
          500: '#EF4444',
          600: '#DC2626',
          700: '#B91C1C',
          800: '#991B1B',
        },
      },

      // Gradient'lar
      backgroundImage: {
        'gradient-primary': 'linear-gradient(135deg, #2060CD 0%, #19A7CE 100%)',
        'gradient-primary-soft': 'linear-gradient(135deg, #E0EBFA 0%, #D9F1F7 100%)',
      },

      // Gölgeler (soft)
      boxShadow: {
        'soft': '0 2px 8px -2px rgba(32, 96, 205, 0.08)',
        'soft-md': '0 4px 16px -4px rgba(32, 96, 205, 0.12)',
        'soft-lg': '0 8px 24px -6px rgba(32, 96, 205, 0.15)',
      },

      // Font ailesi
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
