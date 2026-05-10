import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";
import { VitePWA } from "vite-plugin-pwa";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
    hmr: {
      overlay: false,
    },
  },
  plugins: [
    react(),
    mode === "development" && componentTagger(),
    VitePWA({
      registerType: "autoUpdate",
      includeAssets: ["pwa-icon-192.png", "pwa-icon-512.png"],
      devOptions: {
        enabled: false,
      },
      workbox: {
        navigateFallbackDenylist: [/^\/~oauth/],
        globPatterns: ["**/*.{js,css,html,ico,png,svg,woff2}"],
        // Inject our push notification handler into the generated service worker.
        importScripts: ["push-handler.js"],
        clientsClaim: true,
        skipWaiting: true,
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/.*\.supabase\.co\/rest\/v1\/.*/i,
            handler: "NetworkFirst",
            options: {
              cacheName: "api-cache",
              expiration: { maxEntries: 50, maxAgeSeconds: 300 },
              networkTimeoutSeconds: 5,
            },
          },
          {
            urlPattern: /^https:\/\/.*\.supabase\.co\/storage\/.*/i,
            handler: "CacheFirst",
            options: {
              cacheName: "storage-cache",
              expiration: { maxEntries: 100, maxAgeSeconds: 86400 },
            },
          },
        ],
      },
      manifest: {
        name: "TransplantCare",
        short_name: "TransplantCare",
        description: "Transplantatsiya bemorlarini kuzatish tizimi",
        theme_color: "#0f766e",
        background_color: "#ffffff",
        display: "standalone",
        orientation: "portrait",
        scope: "/",
        start_url: "/",
        icons: [
          { src: "/pwa-icon-192.png", sizes: "192x192", type: "image/png" },
          { src: "/pwa-icon-512.png", sizes: "512x512", type: "image/png" },
          { src: "/pwa-icon-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
        ],
      },
    }),
  ].filter(Boolean),
  resolve: {
    alias: [
      {
        find: "@",
        replacement: path.resolve(__dirname, "./src"),
      },
    ],
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          // Keep React itself in one stable chunk (used everywhere).
          react: ["react", "react-dom", "react-router-dom"],
          // Heavy chart lib — only pulled in by lazy dashboard pages.
          charts: ["recharts"],
          // TanStack Query — used app-wide once authenticated.
          query: ["@tanstack/react-query"],
        },
      },
    },
    // Allow Vite to do its own per-radix splitting; don't bundle every
    // Radix component into one chunk (that would force the login page to
    // download dialog/dropdown/select even though it only uses Tabs).
    target: "es2020",
    cssCodeSplit: true,
  },
}));
