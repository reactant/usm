# usm-pinia

## 5.0.0

### Major Changes

- Target ES2018 in published builds. Applications targeting older browsers must transpile `usm-pinia`.
- Define explicit package exports for the root entry, `package.json`, and the existing `dist/index.cjs.js`, `dist/index.esm.js`, and `dist/index.umd.js` entry paths. Other deep imports, including `usm-pinia/src/*`, are no longer accessible through resolvers that enforce package exports; import public APIs from `usm-pinia`.
- Publish tsdown-built CommonJS, native ESM, and UMD bundles with source maps and bundled `.d.ts` / `.d.mts` declarations. Node.js `import` and `require` share the same exported functions and decorator symbols through an ESM bridge; browser bundlers use the native ESM entry.
- Upgrade `pinia` from `^3.0.3` to `^4.1.0` and declare its required Vue `^3.5.11` and `@vue/devtools-api` `^8.2.1` peers. Pinia 4's declarations require TypeScript 5.6 or newer.
- Require Node.js 22.18 or newer for native `require(ESM)` support because Pinia 4 is ESM-only. CommonJS and the Node ESM bridge retain synchronous loading on supported Node versions. Older browsers need polyfills for Pinia's runtime APIs such as `Object.hasOwn`, in addition to any syntax transpilation.
- Validate development and production behavior with Vitest, and check independently installed CommonJS, ESM, and UMD builds together with their NodeNext type declarations.
- Move repository development to pnpm, TypeScript 7, Vitest, Oxlint, and Oxfmt, with Changesets managing synchronized releases. Update repository and issue links to [reactant/usm](https://github.com/reactant/usm).
