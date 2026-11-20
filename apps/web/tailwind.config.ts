import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/features/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
    './src/demo/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        sand: {
          0: '#f7f2ea',
          50: '#f1eadc',
          100: '#e8dcc8',
          200: '#d9c7ab',
          300: '#c4ad8c',
          400: '#a8906e',
          500: '#8c7356',
          600: '#6f5a42',
          700: '#554534',
          800: '#3d3227',
          900: '#2a231c',
        },
        clay: {
          DEFAULT: '#8a5a3c',
          deep: '#6b432e',
        },
      },
      fontFamily: {
        serif: ['var(--font-serif)', 'Georgia', 'serif'],
        sans: ['var(--font-sans)', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        phone: '0 40px 80px -24px rgba(42, 35, 28, 0.55), 0 0 0 1px rgba(255,247,236,0.08)',
      },
    },
  },
  plugins: [],
};

export default config;
