/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        sans: ["'Plus Jakarta Sans'", "ui-sans-serif", "system-ui", "sans-serif"]
      },
      colors: {
        finance: {
<<<<<<< HEAD
          ink: "#062b4f",
          navy: "#06345f",
          muted: "#5c7288",
          line: "#d9e0e7",
          canvas: "#f4f7fa",
          teal: "#13859a",
          cyan: "#20a6b8",
          green: "#13859a",
          blue: "#06345f",
          amber: "#b45309",
          red: "#b91c1c"
=======
          ink: "#16203b",
          navy: "#1e2b4d",
          muted: "#64748b",
          line: "#e2e8f0",
          canvas: "#f8fafc",
          gold: "#a57c50",
          goldDark: "#77542e",
          goldLight: "#faf6f0",
          bronze: "#ab8456",
          teal: "#a57c50",
          cyan: "#ab8456",
          green: "#1e2b4d",
          blue: "#1e2b4d",
          amber: "#a57c50",
          red: "#b91c1c"
        },
        cyan: {
          50: "#faf6f0",
          100: "#f4efe6",
          200: "#e5d7c2",
          300: "#d5c0a4",
          400: "#bea17c",
          500: "#a57c50",
          600: "#8e683e",
          700: "#77542e",
          800: "#5f4123",
          900: "#48311b",
          950: "#2d1e10"
>>>>>>> mockup-fe
        }
      },
      borderRadius: {
        enterprise: "8px"
      },
      boxShadow: {
        enterprise: "0 24px 70px rgba(15,23,42,.22)"
      }
    }
  },
  plugins: []
};
