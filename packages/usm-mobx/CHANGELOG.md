# usm-mobx

## 5.0.0

### Major Changes

- Target ES2018 in published builds. Applications targeting older browsers must transpile `usm-mobx`.
- Define explicit package exports for the root entry, `package.json`, and the existing `dist/index.cjs.js`, `dist/index.esm.js`, and `dist/index.umd.js` entry paths. Other deep imports, including `usm-mobx/src/*`, are no longer accessible through resolvers that enforce package exports; import public APIs from `usm-mobx`.
- Publish tsdown-built CommonJS, native ESM, and UMD bundles with source maps and bundled `.d.ts` / `.d.mts` declarations. Node.js `import` and `require` share the same exported functions and decorator symbols through an ESM bridge; browser bundlers use the native ESM entry.
- Upgrade `mobx` from `^6.13.7` to `^7.1.7`. MobX 7 requires Proxy support and removes its own legacy decorators and namespaced annotations. USM's `@state`, `@computed`, and `@action` decorators continue to work through explicit `makeObservable` annotations; nested actions, preloaded collections, and computed reactions are covered by regression tests. Applications using MobX APIs directly must follow the [MobX 7 migration notes](https://github.com/mobxjs/mobx/releases/tag/mobx%407.0.0).
- Include the `ESNext.Disposable` library reference required by MobX 7's reaction types in both declaration formats, so TypeScript consumers do not need Node.js types or a custom `lib` setting. Validate development and production behavior, including independently installed package builds.
- Move repository development to pnpm, TypeScript 7, Vitest, Oxlint, and Oxfmt, with Changesets managing synchronized releases. Update repository and issue links to [reactant/usm](https://github.com/reactant/usm).
