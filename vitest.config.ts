/// <reference types="vitest" />
import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react-swc";
import path from "path";

// Test runner only; the app itself is built and served by Next.js.
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: [
      // Components use the Next.js router adapter; tests run them inside react-router's MemoryRouter.
      { find: /^@\/lib\/router$/, replacement: path.resolve(__dirname, "./src/lib/router.rr.tsx") },
      { find: "@", replacement: path.resolve(__dirname, "./src") },
    ],
  },
  test: {
    environment: "jsdom",
    include: ["src/**/*.test.{ts,tsx}", "deploy/**/*.test.{js,ts}", "scripts/**/*.test.mjs"],
  },
});
