/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        sans: ["'Plus Jakarta Sans'", "ui-sans-serif", "system-ui", "sans-serif"],
        mono: ["'Plus Jakarta Sans'", "ui-monospace", "Menlo", "monospace"]
      },
      fontSize: {
        '2xs': ['0.65rem', { lineHeight: '0.85rem' }],
        'xs': ['0.725rem', { lineHeight: '0.95rem' }],
        'sm': ['0.815rem', { lineHeight: '1.1rem' }],
        'base': ['0.875rem', { lineHeight: '1.25rem' }],
        'lg': ['1rem', { lineHeight: '1.35rem' }],
        'xl': ['1.125rem', { lineHeight: '1.45rem' }],
        '2xl': ['1.25rem', { lineHeight: '1.55rem' }],
        '3xl': ['1.45rem', { lineHeight: '1.75rem' }],
        '4xl': ['1.75rem', { lineHeight: '2.1rem' }],
      },
      colors: {
        andalan: {
          50: "#FBF6F0",
          100: "#F4E9DC",
          200: "#E7D3BC",
          300: "#D5B694",
          400: "#BE9770",
          500: "#A57C50",
          600: "#8C6740",
          700: "#6E5033",
          800: "#4F3A26",
          900: "#32251A",
          ink: "#1A1612",
          surface: "#FBF6F0",
          paper: "#FFFFFF"
        },
        aap: {
          50: "#FBF6F0",
          100: "#F4E9DC",
          200: "#E7D3BC",
          300: "#D5B694",
          400: "#BE9770",
          500: "#A57C50",
          600: "#8C6740",
          700: "#6E5033",
          800: "#4F3A26",
          900: "#32251A"
        },
        ink: {
          50: "#FAF8F4",
          100: "#F2EEE8",
          200: "#E6E1D9",
          300: "#C9C2B8",
          400: "#9A9187",
          500: "#6B6055",
          600: "#5A5046",
          700: "#3A322A",
          800: "#241F19",
          900: "#1A1612"
        },
        finance: {
          ink: "#1A1612",
          navy: "#241F19",
          muted: "#6B6055",
          line: "#E6E1D9",
          canvas: "#FAF8F4",
          gold: "#A57C50",
          goldDark: "#6E5033",
          goldLight: "#FBF6F0",
          bronze: "#8C6740",
          teal: "#A57C50",
          cyan: "#8C6740",
          green: "#2E7D53",
          blue: "#2C5F80",
          amber: "#C98A12",
          red: "#B3352B"
        },
        cyan: {
          50: "#FBF6F0",
          100: "#F4E9DC",
          200: "#E7D3BC",
          300: "#D5B694",
          400: "#BE9770",
          500: "#A57C50",
          600: "#8C6740",
          700: "#6E5033",
          800: "#4F3A26",
          900: "#32251A",
          950: "#1A1612"
        }
      },
      borderRadius: {
        control: "3px",
        card: "4px",
        enterprise: "4px",
        dialog: "6px"
      },
      boxShadow: {
        enterprise: "0 4px 16px rgba(26,22,18,.06)",
        card: "0 1px 3px rgba(26,22,18,.05), 0 1px 2px rgba(26,22,18,.03)"
      }
    }
  },
  plugins: []
};
