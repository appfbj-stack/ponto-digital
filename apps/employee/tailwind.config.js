/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: ['class'],
  content: [
    './src/pages/**/*.{ts,tsx}',
    './src/components/**/*.{ts,tsx}',
    './src/app/**/*.{ts,tsx}',
    '../../packages/ui/src/**/*.{ts,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        background: 'hsl(var(--background))',
        foreground: 'hsl(var(--foreground))',
        primary: {
          DEFAULT: 'hsl(var(--primary))',
          foreground: 'hsl(var(--primary-foreground))',
        },
        card: {
          DEFAULT: 'hsl(var(--card))',
          foreground: 'hsl(var(--card-foreground))',
        },
        success: { DEFAULT: 'hsl(142 71% 45%)', foreground: 'hsl(0 0% 100%)' },
        warning: { DEFAULT: 'hsl(38 92% 50%)', foreground: 'hsl(0 0% 100%)' },
        destructive: { DEFAULT: 'hsl(0 84% 60%)', foreground: 'hsl(0 0% 100%)' },
        muted: { DEFAULT: 'hsl(210 40% 96%)', foreground: 'hsl(215 16% 47%)' },
        border: 'hsl(214 32% 91%)',
        input: 'hsl(214 32% 91%)',
      },
    },
  },
  plugins: [],
};
