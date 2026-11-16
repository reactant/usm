import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { readdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { root } from './packages.mjs';
import { validateRelease } from './release-utils.mjs';

assert.equal(
  process.argv.length,
  2,
  'Add a changeset first, then run pnpm release:version without a version argument'
);
execFileSync(
  process.execPath,
  [fileURLToPath(import.meta.resolve('@changesets/cli/bin.js')), 'version'],
  { cwd: root, stdio: 'inherit' }
);

// Changesets owns public versions and changelogs. Keep private workspace
// metadata in sync for the existing single-version release checks.
const manifests = [
  'package.json',
  ...readdirSync(path.join(root, 'packages')).map(
    (name) => `packages/${name}/package.json`
  ),
].map((file) => ({
  file,
  manifest: JSON.parse(readFileSync(path.join(root, file), 'utf8')),
}));
const { version } = validateRelease({
  manifests: manifests
    .filter(({ manifest }) => !manifest.private)
    .map(({ manifest }) => manifest),
});
for (const { file, manifest } of manifests.filter(
  ({ manifest }) => manifest.private
)) {
  manifest.version = version;
  writeFileSync(
    path.join(root, file),
    JSON.stringify(manifest, null, 2) + '\n'
  );
}
execFileSync(
  'pnpm',
  [
    'exec',
    'oxfmt',
    '--write',
    'package.json',
    'packages/*/package.json',
    'packages/*/CHANGELOG.md',
    '.changeset',
  ],
  {
    cwd: root,
    stdio: 'inherit',
  }
);
console.log(
  `Prepared ${version}. Review the versions and changelogs before committing and creating the release tag.`
);
