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
        },
    };
});
