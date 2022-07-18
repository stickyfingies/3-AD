import path from 'path';
import { defineConfig } from 'vite';
import dts from 'vite-plugin-dts';

const resolvePath = (str: string) => path.resolve(__dirname, str);

export default defineConfig({
  build: {
    assetsDir: '',
    target: 'esnext',
    lib: {
      entry: resolvePath('lib/index.ts'),
      name: '3-AD',
      formats: ['es'],
      fileName: format => `index.${format}.js`
    },
    rollupOptions: {
      // input: {
      //   main: resolvePath('index.html'),
      // },
      external: ['three'],
    }
  },
  worker: {
    format: 'es'
  },
  plugins: [
    dts(),
    {
      name: "configure-response-headers",
      configureServer: (server) => {
        server.middlewares.use((_req, res, next) => {
          res.setHeader("Cross-Origin-Embedder-Policy", "require-corp");
          res.setHeader("Cross-Origin-Opener-Policy", "same-origin");
          next();
        });
      },
    },
  ]
});