import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig, type Plugin} from 'vite';

/** Escribe dist/live.json: dónde está la versión más reciente de la app, para que el APK la cargue en vivo. */
const liveManifest = (): Plugin => ({
  name: 'essimple-live-manifest',
  apply: 'build',
  generateBundle(_options, bundle) {
    const app = Object.values(bundle).find(
      c => c.type === 'chunk' && c.isDynamicEntry && (c.facadeModuleId || '').replace(/\\/g, '/').endsWith('/src/app-entry.tsx')
    );
    if (!app || app.type !== 'chunk') return;
    const css: string[] = [];
    const seen = new Set<string>();
    const walk = (name: string) => {
      if (seen.has(name)) return;
      seen.add(name);
      const c = bundle[name];
      if (!c || c.type !== 'chunk') return;
      (c.viteMetadata?.importedCss || new Set<string>()).forEach((f: string) => css.push('/' + f));
      c.imports.forEach(walk);
    };
    walk(app.fileName);
    this.emitFile({
      type: 'asset',
      fileName: 'live.json',
      source: JSON.stringify({ app: '/' + app.fileName, css: [...new Set(css)], builtAt: new Date().toISOString() }),
    });
  },
});

export default defineConfig(() => {
  return {
    plugins: [react(), tailwindcss(), liveManifest()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modify—file watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
      // Disable file watching when DISABLE_HMR is true to save CPU during agent edits.
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
  };
});
