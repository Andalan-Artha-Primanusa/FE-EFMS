/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        finance: {
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
