import assert from 'node:assert/strict';

export const registry = 'https://registry.npmjs.org';
export const repository = 'reactant/usm';
export const packageNames = [
  'usm',
  'usm-mobx',
  'usm-pinia',
  'usm-redux',
  'usm-vuex',
];

export function validateVersion(version) {
  const message = 'Expected an exact version such as 4.10.0 or 4.10.0-beta.1';
  assert.equal(typeof version, 'string', message);
  const match =
    /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(?:-([\da-zA-Z-]+(?:\.[\da-zA-Z-]+)*))?$/.exec(
      version
    );
  assert.ok(match && match[0] === version, message);
  for (const identifier of match[4]?.split('.') ?? []) {
    assert.ok(
      !/^0\d+$/.test(identifier),
      'Numeric prerelease identifiers cannot have leading zeros'
    );
  }
}

export function validateRelease({ manifests, tag, prerelease }) {
  assert.deepEqual(manifests.map(({ name }) => name).sort(), packageNames);
  const version = manifests[0].version;
  validateVersion(version);
  for (const manifest of manifests) {
    assert.notEqual(manifest.private, true, `${manifest.name} must be public`);
    assert.equal(
      manifest.version,
      version,
      `${manifest.name} has a different version`
    );
    assert.equal(
      manifest.repository.url,
      `git+https://github.com/${repository}.git`
    );
    assert.equal(manifest.publishConfig.access, 'public');
    assert.equal(manifest.publishConfig.registry, registry);
  }
  const isPrerelease = version.includes('-');
  if (tag !== undefined) {
    assert.ok(
      tag === version || tag === `v${version}`,
      `Release tag ${tag} does not match ${version}`
    );
    assert.equal(
      prerelease,
      isPrerelease,
      'GitHub prerelease flag does not match package version'
    );
  }
  return { version, distTag: isPrerelease ? 'next' : 'latest' };
}

export function validatePublishEnvironment(env) {
  assert.equal(
    env.GITHUB_ACTIONS,
    'true',
    'Publishing requires GitHub Actions'
  );
  assert.equal(env.GITHUB_REPOSITORY, repository);
  assert.equal(
    env.GITHUB_EVENT_NAME,
    'release',
    'Only published releases may publish packages'
  );
  assert.ok(env.RELEASE_TAG);
  assert.equal(env.GITHUB_REF, `refs/tags/${env.RELEASE_TAG}`);
  assert.ok(env.ACTIONS_ID_TOKEN_REQUEST_URL, 'Missing OIDC request URL');
  assert.ok(env.ACTIONS_ID_TOKEN_REQUEST_TOKEN, 'Missing OIDC request token');
}
