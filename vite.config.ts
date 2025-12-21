import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react-swc';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, '.', '');
  return {
    server: {
      port: 3000,
      host: '0.0.0.0',
      proxy: {
        // Forward API calls to the local Node server in development
        '/api': 'http://localhost:8080',
      },
    },
    preview: {
      // Allow Cloud Run's *.run.app hosts
      allowedHosts: true,
    },
    plugins: [react()],
    define: {
      // Only expose non-sensitive values to the client.
      'import.meta.env.VITE_API_BASE_URL': JSON.stringify(
        env.VITE_API_BASE_URL || ''
      ),
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
  };
});
