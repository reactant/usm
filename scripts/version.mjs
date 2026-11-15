import { execFileSync } from 'node:child_process';
import { readdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { root } from './packages.mjs';
import { validateVersion } from './release-utils.mjs';

const version = process.argv[2];
validateVersion(version);
const files = [
  'package.json',
  ...readdirSync(path.join(root, 'packages')).map(
    (name) => `packages/${name}/package.json`
  ),
];
for (const file of files) {
  const fullPath = path.join(root, file);
  const manifest = JSON.parse(readFileSync(fullPath, 'utf8'));
  manifest.version = version;
  writeFileSync(fullPath, JSON.stringify(manifest, null, 2) + '\n');
}
execFileSync('pnpm', ['exec', 'oxfmt', '--write', ...files], {
  cwd: root,
  stdio: 'inherit',
});
console.log(
  `Updated all package versions to ${version}. Review and commit before creating the release tag.`
);
