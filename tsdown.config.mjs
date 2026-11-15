import { copyFileSync } from 'node:fs';
import path from 'node:path';
import { defineConfig } from 'tsdown';
import { packages, root } from './scripts/packages.mjs';

export default defineConfig(
  packages.map(({ cwd, manifest }) => ({
    name: manifest.name,
    cwd,
    entry: { index: 'src/index.ts' },
    outDir: 'dist',
    tsconfig: path.join(root, 'tsconfig.json'),
    target: 'es2018',
    platform: 'neutral',
    clean: true,
    minify: true,
    sourcemap: true,
    define: { __DEV__: 'false' },
    deps: { neverBundle: Object.keys(manifest.dependencies ?? {}) },
    dts: { compilerOptions: { skipLibCheck: true } },
    format: {
      esm: {
        outExtensions: () => ({ js: '.mjs', dts: '.d.mts' }),
      },
      cjs: {
        outExtensions: () => ({ js: '.cjs.js', dts: '.d.ts' }),
        outputOptions: (options, _, { cjsDts }) =>
          cjsDts ? { ...options, entryFileNames: '[name].js' } : options,
      },
      umd: {
        dts: false,
        globalName: manifest.name.replace(/-(\w)/g, (_, letter) => letter.toUpperCase()),
        outExtensions: () => ({ js: '.js' }),
        outputOptions: {
          globals: {
            mutative: 'mutative',
            redux: 'redux',
            mobx: 'mobx',
            vuex: 'vuex',
            pinia: 'pinia',
          },
        },
      },
    },
    hooks: {
      'build:done': () => {
        // Keep the existing bundler entry and CDN URLs alongside native ESM.
        copyFileSync(path.join(cwd, 'dist/index.mjs'), path.join(cwd, 'dist/index.esm.js'));
        copyFileSync(path.join(root, 'LICENSE'), path.join(cwd, 'dist/LICENSE'));
      },
    },
  }))
);
