import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        dark: {
          bg:      '#0A0F1A',
          card:    '#111827',
          border:  '#1E2A3A',
        },
        accent: {
          gold:    '#D4A017',
          green:   '#2ECC71',
          red:     '#E74C3C',
          blue:    '#3498DB',
        },
        text: {
          primary:  '#E0E8F0',
          muted:    '#556677',
          dim:      '#334455',
        },
      },
      fontFamily: {
        sans: ['var(--font-inter)', 'Segoe UI', 'sans-serif'],
      },
    },
  },
  plugins: [],
}

export default config
