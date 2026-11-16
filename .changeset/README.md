# Changesets

Run `pnpm changeset` when changing a public package. Select the affected package,
choose a patch, minor, or major bump, and write a user-facing description. Commit
the generated Markdown file with the implementation.

The five public packages form one fixed group: a release updates all five to the
same version. Private workspaces are never published or tagged. Changesets uses
Oxfmt to format its files and generated changelogs.

Use `pnpm changeset:status` to review the pending release plan. Documentation,
test, and development-tool-only changes do not need a package release; use
`pnpm changeset --empty` if recording that decision is useful.

`pnpm check` and release preparation validate Changesets configuration and the
pending release plan. CI also exercises real version updates in isolated
workspaces, including patch/minor/major bumps and prerelease-to-stable releases.

See [Publishing](../docs/publishing.md) for release preparation and the existing
npm Trusted Publishing workflow.
