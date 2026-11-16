# usm-redux

## 5.0.0

### Major Changes

- Upgrade `mutative` from `^1.3.0` to `^2.0.2` for Redux-backed immutable action updates. Middleware reading `_patches` and `_inversePatches` now receives patches with Mutative v2 ordering and value-sharing semantics. Review the [Mutative v2 migration guide](https://mutative.js.org/docs/advanced-guides/migration-v2/) and copy patch values before mutating them. The Redux dependency remains `^5.0.1`.
- Target ES2018 in published builds. Applications targeting older browsers must transpile both `usm-redux` and Mutative.
- Define explicit package exports for the root entry, `package.json`, and the existing `dist/index.cjs.js`, `dist/index.esm.js`, and `dist/index.umd.js` entry paths. Other deep imports, including `usm-redux/src/*`, are no longer accessible through resolvers that enforce package exports; import public APIs from `usm-redux`.
- Publish tsdown-built CommonJS, native ESM, and UMD bundles with source maps and bundled `.d.ts` / `.d.mts` declarations. Node.js `import` and `require` share decorator symbols, staged action state, and re-exported Mutative helpers through an ESM bridge; browser bundlers use the native ESM entry.
- Add regression coverage for nested actions producing one Redux dispatch, reordered array drafts, forward and inverse patch replay, structural sharing, and strict-mode freezing.
- Correct browser UMD dependency globals to `Mutative` and `Redux`. Redux 5 provides browser ESM; script-tag users must bundle it as the `Redux` global, or use ESM imports. Validate the browser UMD path with these upstream builds.
- Move repository development to pnpm, TypeScript 7, Vitest, Oxlint, and Oxfmt, with Changesets managing synchronized releases. Update repository and issue links to [reactant/usm](https://github.com/reactant/usm).
