import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// base './' lets the built site run from any sub-path (GitHub Pages, Netlify, a folder).
export default defineConfig({
  base: './',
  plugins: [react()],
});
