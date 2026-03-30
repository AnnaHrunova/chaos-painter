import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
  const repositoryName = process.env.GITHUB_REPOSITORY?.split('/')[1] ?? '';
  const explicitBase = process.env.VITE_BASE_PATH;
  const base =
    explicitBase ??
    (mode === 'production' && repositoryName ? `/${repositoryName}/` : '/');

  return {
    base,
    plugins: [react()],
    build: {
      sourcemap: true,
      rollupOptions: {
        output: {
          manualChunks(id) {
            if (id.includes('node_modules/@react-three') || id.includes('node_modules/three')) {
              return 'three';
            }

            if (id.includes('node_modules/html2canvas')) {
              return 'export';
            }

            if (id.includes('node_modules/react') || id.includes('node_modules/react-dom')) {
              return 'react-vendor';
            }

            return undefined;
          },
        },
      },
    },
  };
});
