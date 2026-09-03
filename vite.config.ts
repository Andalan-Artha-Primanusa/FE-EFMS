import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  optimizeDeps: {
    include: [
      "react",
      "react-dom",
      "react-router-dom",
      "lucide-react",
      "recharts",
      "lodash"
    ]
  },
  build: {
    chunkSizeWarningLimit: 1200,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes("node_modules")) {
            if (id.includes("react") || id.includes("react-dom") || id.includes("react-router-dom")) {
              return "vendor-react";
            }
            if (id.includes("recharts")) {
              return "vendor-charts";
            }
            if (id.includes("@glideapps") || id.includes("@fortune-sheet")) {
              return "vendor-grids";
            }
            if (id.includes("lucide-react") || id.includes("lodash") || id.includes("xlsx")) {
              return "vendor-utils";
            }
          }
          if (id.includes("excelDataBundle")) {
            return "excel-dataset";
          }
        }
      }
    }
  },
  server: {
    port: 5175,
    watch: {
      usePolling: true,
      interval: 1000,
      ignored: ["**/public/**", "**/*.xlsx", "**/*.png", "**/*.jpg", "**/*.pdf", "**/.git/**"]
    },
    proxy: {
      "/api": {
        target: "http://160.19.165.216:7070",
        changeOrigin: true
      }
    }
  }
});
