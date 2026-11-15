import { AssertionError } from 'node:assert';
import { describe, expect, test } from 'vitest';
import {
  packageNames,
  parsePackOutput,
  registry,
  repository,
  validatePublishEnvironment,
  validateRelease,
  validateVersion,
} from '../release-utils.mjs';

const manifests = (version = '4.10.0') =>
  packageNames.map((name) => ({
    name,
    version,
    repository: { url: `git+https://github.com/${repository}.git` },
    publishConfig: { access: 'public', registry },
  }));

describe('npm pack metadata', () => {
  const packed = { name: 'usm', version: '4.10.0', filename: 'usm-4.10.0.tgz' };
  test.each([[packed], { usm: packed }])(
    'accepts npm 11 and npm 12 output %j',
    (output) => {
      expect(parsePackOutput(JSON.stringify(output), 'usm')).toEqual(packed);
    }
  );
  test.each([[], {}, [packed, packed]])(
    'rejects missing or ambiguous output %j',
    (output) => {
      expect(() => parsePackOutput(JSON.stringify(output), 'usm')).toThrow(
        AssertionError
      );
    }
  );
  test('rejects a different package', () => {
    expect(() =>
      parsePackOutput(JSON.stringify([packed]), 'usm-redux')
    ).toThrow(AssertionError);
  });
});

describe('release validation', () => {
  test.each([
    '4.10',
    'v4.10.0',
    '04.10.0',
    '4.10.0\n',
    '4.10.0-beta.01',
    '4.10.0-00',
  ])('rejects invalid package version %j', (version) => {
    expect(() => validateVersion(version)).toThrow(AssertionError);
  });
  test.each(['4.10.0', '4.10.0-0', '4.10.0-beta.1', '4.10.0-01a'])(
    'accepts exact package version %s',
    (version) => {
      expect(() => validateVersion(version)).not.toThrow(AssertionError);
    }
  );
  test.each(['4.10.0', 'v4.10.0'])('accepts stable tag %s', (tag) => {
    expect(
      validateRelease({ manifests: manifests(), tag, prerelease: false })
    ).toEqual({ version: '4.10.0', distTag: 'latest' });
  });
  test('routes prereleases to next', () => {
    expect(
      validateRelease({
        manifests: manifests('4.10.0-beta.1'),
        tag: 'v4.10.0-beta.1',
        prerelease: true,
      }).distTag
    ).toBe('next');
  });
  test.each([
    'v4.9.0',
    'refs/tags/v4.10.0',
    'v4.10.0\n',
    'v4.10.0; echo unexpected',
  ])('rejects mismatched tag %j', (tag) => {
    expect(() =>
      validateRelease({ manifests: manifests(), tag, prerelease: false })
    ).toThrow(AssertionError);
  });
  test('rejects inconsistent prerelease flags', () => {
    expect(() =>
      validateRelease({
        manifests: manifests(),
        tag: 'v4.10.0',
        prerelease: true,
      })
    ).toThrow(AssertionError);
  });
  test('rejects partial version bumps', () => {
    const packages = manifests();
    packages[1].version = '4.9.0';
    expect(() => validateRelease({ manifests: packages })).toThrow(
      AssertionError
    );
  });
  test('rejects missing packages', () => {
    expect(() => validateRelease({ manifests: manifests().slice(1) })).toThrow(
      AssertionError
    );
  });
  test('rejects the old repository identity', () => {
    const packages = manifests();
    packages[0].repository.url = 'git+https://github.com/unadlib/usm.git';
    expect(() => validateRelease({ manifests: packages })).toThrow(
      AssertionError
    );
  });
  test('rejects private packages', () => {
    const packages = manifests();
    packages[0].private = true;
    expect(() => validateRelease({ manifests: packages })).toThrow(
      AssertionError
    );
  });
});

describe('publishing environment', () => {
  const environment = {
    GITHUB_ACTIONS: 'true',
    GITHUB_REPOSITORY: repository,
    GITHUB_EVENT_NAME: 'release',
    RELEASE_TAG: 'v4.10.0',
    GITHUB_REF: 'refs/tags/v4.10.0',
    ACTIONS_ID_TOKEN_REQUEST_URL: 'https://example.test/oidc',
    ACTIONS_ID_TOKEN_REQUEST_TOKEN: 'test-token',
  };
  test('accepts a tagged GitHub release with OIDC', () => {
    expect(() => validatePublishEnvironment(environment)).not.toThrow(
      AssertionError
    );
  });
  test.each(Object.keys(environment))('rejects missing %s', (key) => {
    const incomplete = { ...environment };
    delete incomplete[key];
    expect(() => validatePublishEnvironment(incomplete)).toThrow(
      AssertionError
    );
  });
  test.each(['push', 'pull_request', 'workflow_dispatch'])(
    'rejects %s publishing',
    (event) => {
      expect(() =>
        validatePublishEnvironment({ ...environment, GITHUB_EVENT_NAME: event })
      ).toThrow(AssertionError);
    }
  );
});
