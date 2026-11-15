import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import {
  appendFileSync,
  mkdirSync,
  readFileSync,
  writeFileSync,
} from 'node:fs';
import path from 'node:path';
import { packages, root } from './packages.mjs';
import {
  parsePackOutput,
  registry,
  validatePublishEnvironment,
  validateRelease,
} from './release-utils.mjs';

const mode = process.argv[2];
assert.ok(
  ['check', 'pack', 'publish', 'dry-run'].includes(mode),
  'Expected check, pack, publish, or dry-run'
);
const tag = process.env.RELEASE_TAG || undefined;
const { version, distTag } = validateRelease({
  manifests: packages.map(({ manifest }) => manifest),
  tag,
  prerelease: process.env.RELEASE_PRERELEASE === 'true',
});
const rootManifest = JSON.parse(
  readFileSync(path.join(root, 'package.json'), 'utf8')
);
assert.equal(
  rootManifest.version,
  version,
  'Root and package versions must agree'
);
console.log(
  `Release ${version}: ${packages.length} packages, npm tag ${distTag}`
);
if (process.env.GITHUB_OUTPUT) {
  appendFileSync(
    process.env.GITHUB_OUTPUT,
    `version=${version}\ndist-tag=${distTag}\n`
  );
}
const directory = path.join(root, '.release');
if (mode === 'pack') {
  mkdirSync(directory, { recursive: true });
  const artifacts = packages.map(({ cwd, manifest }) => {
    const packed = parsePackOutput(
      execFileSync(
        'npm',
        ['pack', '--json', '--ignore-scripts', '--pack-destination', directory],
        { cwd, encoding: 'utf8' }
      ),
      manifest.name
    );
    assert.equal(packed.name, manifest.name);
    assert.equal(packed.version, version);
    return {
      name: packed.name,
      version,
      filename: packed.filename,
      integrity: packed.integrity,
    };
  });
  writeFileSync(
    path.join(directory, 'manifest.json'),
    JSON.stringify(artifacts, null, 2) + '\n'
  );
} else if (mode === 'publish' || mode === 'dry-run') {
  if (mode === 'publish') validatePublishEnvironment(process.env);
  const artifacts = JSON.parse(
    readFileSync(path.join(directory, 'manifest.json'), 'utf8')
  );
  assert.deepEqual(
    artifacts.map(({ name }) => name).sort(),
    packages.map(({ manifest }) => manifest.name).sort()
  );
  // Validate every artifact and registry version before publishing any package.
  const pending = [];
  for (const artifact of artifacts) {
    assert.equal(artifact.version, version);
    assert.equal(artifact.filename, `${artifact.name}-${version}.tgz`);
    const file = path.join(directory, artifact.filename);
    const integrity = `sha512-${createHash('sha512').update(readFileSync(file)).digest('base64')}`;
    assert.equal(
      integrity,
      artifact.integrity,
      `Integrity mismatch: ${artifact.name}`
    );
    if (mode === 'publish') {
      const response = await fetch(`${registry}/${artifact.name}/${version}`, {
        signal: AbortSignal.timeout(30_000),
      });
      if (response.ok) {
        const published = await response.json();
        assert.equal(
          published.dist.integrity,
          integrity,
          `${artifact.name}@${version} already exists with different contents`
        );
        console.log(
          `Already published with identical contents: ${artifact.name}@${version}`
        );
        continue;
      }
      assert.equal(
        response.status,
        404,
        `Registry preflight failed for ${artifact.name}`
      );
    }
    pending.push(file);
  }
  for (const file of pending) {
    const args = [
      'publish',
      file,
      '--ignore-scripts',
      '--access',
      'public',
      '--tag',
      distTag,
      '--registry',
      registry,
    ];
    // A dry run must also work for the currently published workspace version.
    // Force bypasses npm's existing-version check only; it never reaches uploads.
    args.push(
      ...(mode === 'publish' ? ['--provenance'] : ['--dry-run', '--force'])
    );
    execFileSync('npm', args, { cwd: root, stdio: 'inherit' });
  }
}
