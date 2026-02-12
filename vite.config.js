import { defineConfig } from "vite";

export default defineConfig({
  server: {
    host: true,
    port: 5173
  },
  preview: {
    host: true,
    port: 4173
  },
  build: {
    target: "es2020",
    sourcemap: true
  }
});

// # TODO(BUILD-001): Split vendor chunks if bundle size grows after high-poly assets are added.
