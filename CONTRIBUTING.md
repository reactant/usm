# Development

Use Node.js 22.18+, 24.11+, or 26+ and the pnpm version pinned in `package.json`.
The published packages retain their Node.js 14+ runtime requirement; the development tools require a newer Node.js version.

```sh
corepack enable
pnpm install --frozen-lockfile
pnpm check
```

| Command                             | Purpose                                                                                                        |
| ----------------------------------- | -------------------------------------------------------------------------------------------------------------- |
| `pnpm build`                        | Build all five packages with tsdown, including CommonJS, native ESM, UMD, declarations, and source maps        |
| `pnpm check:type`                   | Run the TypeScript 7 compiler without skipping dependency declarations                                         |
| `pnpm test`                         | Run Vitest in development and production modes                                                                 |
| `pnpm test:watch`                   | Watch tests during development                                                                                 |
| `pnpm test:package`                 | Pack and independently install all public packages, then check their runtime exports and NodeNext declarations |
| `pnpm lint` / `pnpm lint:fix`       | Check or fix code with Oxlint                                                                                  |
| `pnpm format:check` / `pnpm format` | Check or format code with Oxfmt                                                                                |
| `pnpm clean`                        | Remove generated package builds                                                                                |
| `pnpm changeset`                    | Record a package change and its intended semver bump                                                           |
| `pnpm changeset:status`             | Review the pending release plan                                                                                |
| `pnpm release:version`              | Generate synchronized package versions and changelogs                                                          |

Tests use legacy TypeScript decorators (`experimentalDecorators`) and assignment semantics for class fields (`useDefineForClassFields: false`). These options are part of USM's decorator contract.

Node.js imports use an ESM bridge to the CommonJS entry so both loading methods share decorator symbols and module state. Browser bundlers use the native ESM build. The legacy CommonJS, ESM, and UMD file paths remain available.

Vuex 4 does not expose its declarations in its package exports. The workspace resolves those declarations explicitly, and tsdown bundles the required Vuex declarations into `usm-vuex`; Vue remains an external type dependency. This keeps consumers working with modern TypeScript module resolution.

Include a changeset with user-facing package changes. Changesets uses a fixed group for the five public packages; selecting one affected package is sufficient to keep their release versions aligned. Documentation, tests, and development tooling changes can omit a release changeset. See [Publishing](docs/publishing.md) for versioning and release instructions.
