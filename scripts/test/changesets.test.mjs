import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import {
  copyFileSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  symlinkSync,
  writeFileSync,
  existsSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { afterEach, expect, test } from 'vitest';
import { packageNames } from '../release-utils.mjs';
import { root } from '../packages.mjs';

const fixtures = [];
const readJson = (file) => JSON.parse(readFileSync(file, 'utf8'));

function fixture() {
  const cwd = mkdtempSync(path.join(tmpdir(), 'usm-changesets-'));
  fixtures.push(cwd);
  for (const file of [
    'package.json',
    'pnpm-lock.yaml',
    'pnpm-workspace.yaml',
    '.oxfmtrc.json',
    '.changeset/config.json',
    'scripts/version.mjs',
    'scripts/packages.mjs',
    'scripts/release-utils.mjs',
    'scripts/release.mjs',
    ...[...packageNames, 'test'].map((name) => `packages/${name}/package.json`),
  ]) {
    const target = path.join(cwd, file);
    mkdirSync(path.dirname(target), { recursive: true });
    copyFileSync(path.join(root, file), target);
    if (file.endsWith('package.json')) {
      // Keep the fixture stable when the repository itself is on a prerelease.
      writeFileSync(
        target,
        readFileSync(target, 'utf8').replace(
          /"version": "[^"]+"/,
          '"version": "1.0.0"'
        )
      );
    }
  }
  symlinkSync(
    path.join(root, 'node_modules'),
    path.join(cwd, 'node_modules'),
    'dir'
  );
  writeFileSync(path.join(cwd, '.gitignore'), 'node_modules/\n');
  execFileSync('git', ['init', '--quiet', '--initial-branch=master', cwd]);
  execFileSync('git', ['add', '.'], { cwd });
  execFileSync(
    'git',
    [
      '-c',
      'user.name=Release Test',
      '-c',
      'user.email=release-test@example.test',
      'commit',
      '--quiet',
      '-m',
      'Fixture',
    ],
    { cwd }
  );
  return cwd;
}

function version(cwd, args = []) {
  return execFileSync(
    process.execPath,
    [path.join(cwd, 'scripts/version.mjs'), ...args],
    { cwd, encoding: 'utf8', stdio: 'pipe' }
  );
}

function addChangeset(cwd, bump) {
  writeFileSync(
    path.join(cwd, '.changeset/release-test.md'),
    `---\n"usm": ${bump}\n---\n\nVerify a shared release with a real Changesets invocation.\n`
  );
}

afterEach(() => {
  for (const cwd of fixtures.splice(0))
    rmSync(cwd, { recursive: true, force: true });
});

test.each(['patch', 'minor', 'major'])(
  'versions all public packages for a %s changeset',
  (bump) => {
    const cwd = fixture();
    const [major, minor, patch] = readJson(path.join(cwd, 'package.json'))
      .version.split('.')
      .map(Number);
    const expected =
      bump === 'major'
        ? `${major + 1}.0.0`
        : bump === 'minor'
          ? `${major}.${minor + 1}.0`
          : `${major}.${minor}.${patch + 1}`;
    addChangeset(cwd, bump);
    version(cwd);
    for (const name of packageNames) {
      expect(
        readJson(path.join(cwd, `packages/${name}/package.json`)).version
      ).toBe(expected);
      expect(
        readFileSync(path.join(cwd, `packages/${name}/CHANGELOG.md`), 'utf8')
      ).toContain(expected);
    }
    expect(
      readFileSync(path.join(cwd, 'packages/usm/CHANGELOG.md'), 'utf8')
    ).toContain('Verify a shared release');
    expect(readJson(path.join(cwd, 'package.json')).version).toBe(expected);
    expect(readJson(path.join(cwd, 'packages/test/package.json')).version).toBe(
      expected
    );
    expect(readJson(path.join(cwd, 'packages/test/package.json')).private).toBe(
      true
    );
    expect(existsSync(path.join(cwd, 'packages/test/CHANGELOG.md'))).toBe(
      false
    );
    expect(existsSync(path.join(cwd, '.changeset/release-test.md'))).toBe(
      false
    );
    execFileSync('pnpm', ['exec', 'oxfmt', '--check', '.'], {
      cwd,
      stdio: 'pipe',
    });
    expect(
      execFileSync('git', ['tag', '--list'], { cwd, encoding: 'utf8' })
    ).toBe('');
    execFileSync(
      process.execPath,
      [path.join(cwd, 'scripts/release.mjs'), 'check'],
      {
        cwd,
        env: {
          ...process.env,
          RELEASE_TAG: `v${expected}`,
          RELEASE_PRERELEASE: 'false',
          GITHUB_OUTPUT: '',
        },
        stdio: 'pipe',
      }
    );
  },
  15_000
);

test('refuses to version when there is no pending changeset', () => {
  const cwd = fixture();
  const before = readFileSync(path.join(cwd, 'package.json'), 'utf8');
  assert.throws(
    () => version(cwd),
    (error) => String(error.stdout).includes('No unreleased changesets')
  );
  expect(readFileSync(path.join(cwd, 'package.json'), 'utf8')).toBe(before);
  expect(existsSync(path.join(cwd, 'packages/usm/CHANGELOG.md'))).toBe(false);
}, 15_000);

test('prepares a synchronized prerelease through Changesets pre mode', () => {
  const cwd = fixture();
  addChangeset(cwd, 'minor');
  execFileSync(
    process.execPath,
    [
      fileURLToPath(import.meta.resolve('@changesets/cli/bin.js')),
      'pre',
      'enter',
      'beta',
    ],
    { cwd, stdio: 'pipe' }
  );
  version(cwd);
  const expected = readJson(path.join(cwd, 'package.json')).version;
  expect(expected).toMatch(/-beta\.0$/);
  for (const name of packageNames)
    expect(
      readJson(path.join(cwd, `packages/${name}/package.json`)).version
    ).toBe(expected);
  execFileSync(
    process.execPath,
    [path.join(cwd, 'scripts/release.mjs'), 'check'],
    {
      cwd,
      env: {
        ...process.env,
        RELEASE_TAG: `v${expected}`,
        RELEASE_PRERELEASE: 'true',
        GITHUB_OUTPUT: '',
      },
      stdio: 'pipe',
    }
  );
  execFileSync(
    process.execPath,
    [
      fileURLToPath(import.meta.resolve('@changesets/cli/bin.js')),
      'pre',
      'exit',
    ],
    { cwd, stdio: 'pipe' }
  );
  version(cwd);
  expect(readJson(path.join(cwd, 'package.json')).version).toBe(
    expected.replace(/-beta\.0$/, '')
  );
  expect(existsSync(path.join(cwd, '.changeset/pre.json'))).toBe(false);
}, 15_000);

test('rejects manual version arguments without changing manifests', () => {
  const cwd = fixture();
  const before = readFileSync(path.join(cwd, 'package.json'), 'utf8');
  assert.throws(() => version(cwd, ['99.0.0']), /without a version argument/);
  expect(readFileSync(path.join(cwd, 'package.json'), 'utf8')).toBe(before);
});
