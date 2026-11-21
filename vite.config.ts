import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

/* GitHub Pages serves the app from /<repo-name>/, local dev from /.
   The deploy workflow sets BASE_PATH; everything else defaults to root. */
const base = process.env.BASE_PATH ?? '/';

export default defineConfig({
  base,
  plugins: [
    react(),
    VitePWA({
      /* 'prompt', never 'autoUpdate': a service worker that activates on its
         own could reload the app in the middle of a class. The banner in
         src/app/pwa.ts lets the teacher choose when. */
      registerType: 'prompt',
      injectRegister: null,
      // No includeAssets: globPatterns below already matches everything in
      // public/, and listing them twice just doubles the precache manifest.
      manifest: {
        name: 'Griffin Grader',
        short_name: 'Griffin Grader',
        description: 'Attendance and rubric grading for PE classes. Works offline.',
        start_url: './',
        scope: './',
        display: 'standalone',
        orientation: 'any',
        theme_color: '#0B1F3A',
        background_color: '#0B1F3A',
        icons: [
          { src: 'icons/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png' },
          {
            src: 'icons/icon-maskable-512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
        ],
      },
      workbox: {
        /* Precache every build asset so the first offline launch works.
           No runtimeCaching: the app makes zero requests to other origins. */
        globPatterns: ['**/*.{js,css,html,png,svg,webmanifest}'],
        cleanupOutdatedCaches: true,
        navigateFallback: 'index.html',
      },
      devOptions: { enabled: false },
    }),
  ],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./vitest.setup.ts'],
    include: ['src/**/*.test.{ts,tsx}'],
    css: false,
  },
});
