# usm-pinia

## 5.0.0

### Major Changes

- Target ES2018 in published builds. Applications targeting older browsers must transpile `usm-pinia`.
- Define explicit package exports for the root entry, `package.json`, and the existing `dist/index.cjs.js`, `dist/index.esm.js`, and `dist/index.umd.js` entry paths. Other deep imports, including `usm-pinia/src/*`, are no longer accessible through resolvers that enforce package exports; import public APIs from `usm-pinia`.
- Publish tsdown-built CommonJS, native ESM, and UMD bundles with source maps and bundled `.d.ts` / `.d.mts` declarations. Node.js `import` and `require` share the same exported functions and decorator symbols through an ESM bridge; browser bundlers use the native ESM entry.
- Align with the shared 5.0.0 release while retaining the `pinia` dependency at `^3.0.3` and the existing Pinia-backed store and decorator behavior.
- Validate development and production behavior with Vitest, and check independently installed CommonJS, ESM, and UMD builds together with their NodeNext type declarations.
- Move repository development to pnpm, TypeScript 7, Vitest, Oxlint, and Oxfmt, with Changesets managing synchronized releases. Update repository and issue links to [reactant/usm](https://github.com/reactant/usm).
