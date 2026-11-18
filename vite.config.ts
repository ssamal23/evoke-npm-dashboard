import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  // The /api functions exist only on Vercel. So that `npm run dev` shows the real shared project list, /api is forwarded
  // to the deployed dashboard. This is read-only in practice: the function accepts adds only from its own site, so adding
  // a project from localhost is refused and the entry is kept in this browser instead.
  // Set API_PROXY_TARGET in .env.local to use another address, or to an empty value to turn the forwarding off.
  const target = env.API_PROXY_TARGET ?? 'https://evoke-npm-dashboard.vercel.app';

  return {
    plugins: [react()],
    server: {
      port: 5173,
      proxy: target ? { '/api': { target, changeOrigin: true } } : undefined,
    },
  };
});
