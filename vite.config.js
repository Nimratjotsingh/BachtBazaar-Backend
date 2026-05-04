import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import dotenv from "dotenv";
import path from "path";

// load root .env
dotenv.config({ path: path.resolve(process.cwd(), ".env") });

export default defineConfig({
  plugins: [react()],

  base: "/",
  host: true,
  port: 5173,
  allowedHosts: "all",
  server: {
    proxy: {
      "/api": {
        target:
          process.env.VITE_API_PROXY_TARGET ||
          "http://bachatbazaar.tech",
        changeOrigin: true,
        secure: false,
      },
    },
  },
});
