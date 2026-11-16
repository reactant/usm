# usm-vuex

## 5.0.0

### Major Changes

- Target ES2018 in published builds. Applications targeting older browsers must transpile `usm-vuex`.
- Define explicit package exports for the root entry, `package.json`, and the existing `dist/index.cjs.js`, `dist/index.esm.js`, and `dist/index.umd.js` entry paths. Other deep imports, including `usm-vuex/src/*`, are no longer accessible through resolvers that enforce package exports; import public APIs from `usm-vuex`.
- Publish tsdown-built CommonJS, native ESM, and UMD bundles with source maps and bundled `.d.ts` / `.d.mts` declarations. Node.js `import` and `require` share the same exported functions and decorator symbols through an ESM bridge; browser bundlers use the native ESM entry.
- Bundle the required Vuex declarations into the published type definitions so consumers using modern TypeScript module resolution can resolve them despite Vuex 4 omitting its types from package exports. Vue remains an external type dependency; the Vuex runtime remains external with dependency range `^4.1.0`.
- Declare Vue `^3.5.45` as an application peer and update the tested runtime from 3.5.22 to 3.5.45, including its SSR and compiler dependency fixes. Use the same Vue version for workspace tests and independently installed package checks.
- Align with the shared 5.0.0 release while preserving the existing Vuex-backed store and decorator behavior. The runtime and declarations are checked using independently installed packages and both CommonJS and ESM consumers.
- Move repository development to pnpm, TypeScript 7, Vitest, Oxlint, and Oxfmt, with Changesets managing synchronized releases. Update repository and issue links to [reactant/usm](https://github.com/reactant/usm).
