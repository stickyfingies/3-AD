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
      name: 'Firearm',
      formats: ['es'],
      fileName: (format) => `index.${format}.js`
    },
    rollupOptions: {
      external: ['three'],
    }
  },
  worker: {
    format: 'es'
  },
  plugins: [dts()]
});