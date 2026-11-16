import { copyFileSync, writeFileSync } from 'node:fs';
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
    deps: {
      neverBundle: Object.keys(manifest.dependencies ?? {}),
      // Vuex 4 omits its types from exports; inline them for modern consumers.
      dts: {
        alwaysBundle: ['vuex'],
        neverBundle: Object.keys({
          ...manifest.dependencies,
          ...manifest.devDependencies,
        }).filter((name) => name !== 'vuex'),
      },
    },
    dts: true,
    // MobX 7 exposes Disposable in its types. TS 7's declaration bundler drops
    // source-level lib references, so emit this in both declaration formats.
    banner:
      manifest.name === 'usm-mobx'
        ? { dts: '/// <reference lib="esnext.disposable" />' }
        : undefined,
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
        globalName: manifest.name.replace(/-(\w)/g, (_, letter) =>
          letter.toUpperCase()
        ),
        outExtensions: () => ({ js: '.js' }),
        outputOptions: {
          globals: {
            mutative: 'Mutative',
            redux: 'Redux',
            mobx: 'mobx',
            vuex: 'Vuex',
            pinia: 'Pinia',
          },
        },
      },
    },
    hooks: {
      'build:done': ({ chunks }) => {
        // Keep the existing bundler entry and CDN URLs alongside native ESM.
        copyFileSync(
          path.join(cwd, 'dist/index.mjs'),
          path.join(cwd, 'dist/index.esm.js')
        );
        // Node imports and require must share decorator symbols and staged state.
        const entry = chunks.find(
          (chunk) =>
            chunk.type === 'chunk' &&
            chunk.isEntry &&
            !chunk.fileName.includes('.d.')
        );
        if (entry?.exports.length) {
          writeFileSync(
            path.join(cwd, 'dist/index.node.mjs'),
            `import api from './index.cjs.js';\nexport const { ${entry.exports.join(', ')} } = api;\n`
          );
        }
        copyFileSync(
          path.join(root, 'LICENSE'),
          path.join(cwd, 'dist/LICENSE')
        );
      },
    },
  }))
);
