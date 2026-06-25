/**
 * vite.mobile.config.ts — VigieCity Capacitor build
 *
 * Désactive Nitro (plus de preset Vercel) pour produire une SPA pure dans dist/.
 * Capacitor lit dist/ et l'embarque dans l'APK/IPA.
 *
 * Usage : npm run build:mobile
 * Sync  : npm run mobile:sync   (build + npx cap sync)
 */
import { defineConfig } from "@lovable.dev/vite-tanstack-config";

export default defineConfig({
  tanstackStart: {
    server: { entry: "server" },
  },
  // nitro: false → désactive le bundler serveur, sortie SPA pure dans dist/
  nitro: false,
});
