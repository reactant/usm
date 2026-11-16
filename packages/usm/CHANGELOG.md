# usm

## 5.0.0

### Major Changes

- Upgrade `mutative` from `^1.3.0` to `^2.0.2` for immutable action updates. Generated patches now follow Mutative v2 ordering and value-sharing semantics. Consumers of `_patches` and `_inversePatches` should review the [Mutative v2 migration guide](https://mutative.js.org/docs/advanced-guides/migration-v2/) and copy patch values before mutating them.
- Target ES2018 in published builds. Applications targeting older browsers must transpile both `usm` and Mutative.
- Define explicit package exports for the root entry, `package.json`, and the existing `dist/index.cjs.js`, `dist/index.esm.js`, and `dist/index.umd.js` entry paths. Other deep imports, including `usm/src/*`, are no longer accessible through resolvers that enforce package exports; import public APIs from `usm`.
- Publish tsdown-built CommonJS, native ESM, and UMD bundles with source maps and bundled `.d.ts` / `.d.mts` declarations. Node.js `import` and `require` share the same decorator symbols and staged action state through an ESM bridge; browser bundlers use the native ESM entry.
- Add regression coverage for nested actions, reordered array drafts, forward and inverse patch replay, structural sharing, and strict-mode freezing.
- Correct the browser UMD dependency global to `Mutative` and validate script loading against Mutative's published browser build.
- Move repository development to pnpm, TypeScript 7, Vitest, Oxlint, and Oxfmt, with Changesets managing synchronized releases. Update repository and issue links to [reactant/usm](https://github.com/reactant/usm).
