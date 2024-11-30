import { sentryVitePlugin } from "@sentry/vite-plugin";
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react-swc';
import { nodePolyfills } from 'vite-plugin-node-polyfills'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), nodePolyfills(), sentryVitePlugin({
    org: "aus-zf",
    project: "roboclipper-ftc-web"
  })],

  build: {
    sourcemap: true
  }
});