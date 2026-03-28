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
    },
  };
});

