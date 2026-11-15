# Publishing

The five public packages are `usm`, `usm-redux`, `usm-mobx`, `usm-vuex`, and `usm-pinia`. They share one version. The root workspace and `packages/test` are private and are never published.

## npm Trusted Publisher settings

Each public package's npm Trusted Publisher must authorize:

- Organization: `reactant`
- Repository: `usm`
- Workflow filename: `npm-publish.yml`
- Environment: none (the workflow does not declare a GitHub Environment)
- Allowed action: `npm publish`

The workflow keeps this filename because npm matches it as part of the publisher identity. If an npm configuration uses an environment, update both the npm configuration and the workflow's publishing job together.

Publishing uses npm 12.2.2 on a GitHub-hosted Node.js 24 runner with `id-token: write`. It uses OIDC and provenance, without `NPM_AUTH_TOKEN` or `NODE_AUTH_TOKEN`. pnpm manages the workspace and all build/test tooling; the final upload uses npm's Trusted Publishing implementation. See [npm's documentation](https://docs.npmjs.com/trusted-publishers/).

## Prepare a release

1. Run `pnpm update:version 4.10.0` (substitute the intended version). This updates the root and all workspace manifests without committing, tagging, or pushing.
2. Run `pnpm check` and `pnpm release:check`.
3. Review and commit the changes, push them, and wait for Node CI to pass.
4. Create a tag such as `v4.10.0` at that commit, and publish a GitHub Release for that tag.

The `release: published` event runs the release workflow. A tag push alone does not publish. The workflow checks out the exact release tag and rejects mismatched package versions or a mismatched GitHub prerelease flag. Stable releases use npm's `latest` tag; versions such as `4.10.0-beta.1` require a prerelease and use `next`.

## Validation and publishing

The preparation job runs lint, formatting, a build, complete type checks, and both Vitest modes. It packs all five packages, installs and tests those exact tarballs, then runs npm's publish dry run. The tarballs and their SHA-512 integrity values are transferred to a separate publishing job.

The publishing job checks every artifact and every target registry version before uploading any package. Already-published versions are skipped only when their tarball integrity matches exactly; a different artifact for the same version stops the release. If a publish fails partway through, rerun the failed publishing job using the original artifact rather than rebuilding a different package for the same version.

## Dry runs

Manually run **Node.js Package** from the Actions UI to execute preparation and artifact validation without publishing. The publishing job is enabled only for the GitHub Release event.

The same checks can be run locally:

```sh
pnpm build
pnpm release:check
pnpm release:pack
pnpm test:package --artifacts .release
pnpm release:dry-run
```

The tarballs are written to the ignored `.release/` directory. Dry runs use `npm publish --dry-run --force` so they also work when the workspace version is already published. They validate contents and commands, not version availability or npm's remote Trusted Publisher authorization. Real publishing never uses `--force` and checks registry integrity before uploading.
