import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
export default defineConfig(function (_a) {
    var _b, _c;
    var mode = _a.mode;
    var repositoryName = (_c = (_b = process.env.GITHUB_REPOSITORY) === null || _b === void 0 ? void 0 : _b.split('/')[1]) !== null && _c !== void 0 ? _c : '';
    var explicitBase = process.env.VITE_BASE_PATH;
    var base = explicitBase !== null && explicitBase !== void 0 ? explicitBase : (mode === 'production' && repositoryName ? "/".concat(repositoryName, "/") : '/');
    return {
        base: base,
        plugins: [react()],
        build: {
            sourcemap: true,
            rollupOptions: {
                output: {
                    manualChunks: function (id) {
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
