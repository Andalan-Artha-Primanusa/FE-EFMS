import colors from "tailwindcss/colors";

const INK = { 50: "#FAF8F4", 100: "#F2EEE8", 200: "#E6E1D9", 300: "#C9C2B8", 400: "#9A9187", 500: "#6B6055", 600: "#5A5046", 700: "#3A322A", 800: "#241F19", 900: "#1A1612" };
const BRONZE = { 50: "#FBF6F0", 100: "#F4E9DC", 200: "#E7D3BC", 300: "#D5B694", 400: "#BE9770", 500: "#A57C50", 600: "#8C6740", 700: "#6E5033", 800: "#4F3A26", 900: "#32251A", 950: "#1A1612" };

// Dark mode: warna netral, bg-white, dan tint pastel dibaca dari CSS variable (--c-*),
// sehingga html.dark cukup mengganti nilai variabel (berlaku juga untuk hover:, @apply, /opacity).
const DARK_NEUTRAL = { 50: "#1b1814", 100: "#26221d", 200: "#342f29", 300: "#464038", 400: "#7d756c", 500: "#a39b91", 600: "#bdb5ab", 700: "#d3ccc3", 800: "#e4ded6", 900: "#f2eee8", 950: "#faf7f2" };
const SURFACE_DARK = "#211d19";
const NEUTRALS = { slate: colors.slate, stone: colors.stone, gray: colors.gray, ink: INK };
const TINTS = { ...Object.fromEntries(["red", "orange", "amber", "yellow", "lime", "green", "emerald", "teal", "sky", "blue", "indigo", "violet", "purple", "fuchsia", "pink", "rose"].map((c) => [c, colors[c]])), cyan: BRONZE };
// Elemen berlatar gelap tetap memakai nilai terang di dalamnya (header modal, tombol charcoal)
const KEEP_LIGHT = [".bg-slate-800", ".bg-slate-900", ".bg-slate-950", ".bg-stone-800", ".bg-stone-900", ".bg-stone-950", ".bg-gray-800", ".bg-gray-900", ".bg-ink-700", ".bg-ink-800", ".bg-ink-900", ".bg-finance-ink", ".bg-finance-navy", ".bg-black", ".bg-\\[\\#1A1612\\]", ".bg-\\[\\#16203b\\]", ".bg-\\[\\#1e2b4d\\]", ".bg-\\[\\#251F19\\]"];

const ch = (hex) => hex.slice(1).match(/../g).map((h) => parseInt(h, 16)).join(" ");
const mix = (a, b, t) => { const B = ch(b).split(" "); return ch(a).split(" ").map((x, i) => Math.round(x * (1 - t) + B[i] * t)).join(" "); };
const v = (name) => `rgb(var(--c-${name}) / <alpha-value>)`;
const scale = (prefix, steps) => Object.fromEntries(steps.map((s) => [s, v(`${prefix}-${s}`)]));

const light = { "--c-surface": "255 255 255" };
const dark = { "--c-surface": ch(SURFACE_DARK) };
for (const [n, c] of Object.entries(NEUTRALS)) for (const s of Object.keys(c)) { light[`--c-${n}-${s}`] = ch(c[s]); dark[`--c-${n}-${s}`] = ch(DARK_NEUTRAL[s]); }
for (const [n, c] of Object.entries(TINTS)) {
  for (const [s, t] of [[50, 0.12], [100, 0.2]]) { light[`--c-bg-${n}-${s}`] = ch(c[s]); dark[`--c-bg-${n}-${s}`] = mix(SURFACE_DARK, c[500], t); }
  for (const [s, t] of [[100, 0.3], [200, 0.38], [300, 0.46]]) { light[`--c-bd-${n}-${s}`] = ch(c[s]); dark[`--c-bd-${n}-${s}`] = mix(SURFACE_DARK, c[500], t); }
  for (const [s, d] of [[600, 400], [700, 300], [800, 200], [900, 100]]) { light[`--c-tx-${n}-${s}`] = ch(c[s]); dark[`--c-tx-${n}-${s}`] = ch(c[d]); }
}
const tintKeys = (kind, steps) => Object.fromEntries(Object.keys(TINTS).map((n) => [n, scale(`${kind}-${n}`, steps)]));

/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      screens: {
        'xs': '480px',
        'hd': '1280px',
        'fhd': '1920px',
        '2k': '2560px'
      },
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
        slate: scale("slate", Object.keys(colors.slate)),
        stone: scale("stone", Object.keys(colors.stone)),
        gray: scale("gray", Object.keys(colors.gray)),
        ink: scale("ink", Object.keys(INK)),
        finance: {
          ink: v("ink-900"),
          navy: v("ink-800"),
          muted: v("ink-500"),
          line: v("ink-200"),
          canvas: v("ink-50"),
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
        cyan: BRONZE
      },
      backgroundColor: { white: v("surface"), ...tintKeys("bg", [50, 100]) },
      borderColor: tintKeys("bd", [100, 200, 300]),
      textColor: tintKeys("tx", [600, 700, 800, 900]),
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
  plugins: [({ addBase }) => addBase({ [`:root, .dark :is(${KEEP_LIGHT.join(", ")})`]: light, ".dark": dark })]
};
