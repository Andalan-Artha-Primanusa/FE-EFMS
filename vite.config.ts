import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
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
