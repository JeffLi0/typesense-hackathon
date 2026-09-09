import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    // Don't quietly move to 5174/5180 when 5173 is busy — a shifted port is how
    // you end up demoing a stale tab. Fail loudly so you can kill the old one.
    strictPort: true,
  },
});
