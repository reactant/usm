import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import vm from 'node:vm';
import { publint } from 'publint';
import { Rolldown } from 'tsdown';
import { packages, root } from './packages.mjs';
import { parsePackOutput } from './release-utils.mjs';

const directory = mkdtempSync(path.join(tmpdir(), 'usm-packages-'));
const artifactsFlag = process.argv.indexOf('--artifacts');
const artifactDirectory =
  artifactsFlag === -1
    ? undefined
    : path.resolve(process.argv[artifactsFlag + 1]);
const artifacts = artifactDirectory
  ? JSON.parse(
      readFileSync(path.join(artifactDirectory, 'manifest.json'), 'utf8')
    )
  : undefined;
process.env.NODE_ENV ??= 'production';
try {
  const dependencies = {};
  for (const { cwd, manifest } of packages) {
    const { messages } = await publint({ pkgDir: cwd, strict: true });
    assert.equal(
      messages.length,
      0,
      `${manifest.name}: ${JSON.stringify(messages)}`
    );
    const artifact = artifacts?.find(({ name }) => name === manifest.name);
    if (artifacts)
      assert.ok(artifact, `Missing release artifact: ${manifest.name}`);
    const artifactFile =
      artifact && path.join(artifactDirectory, artifact.filename);
    const args = artifactFile
      ? ['pack', artifactFile, '--dry-run', '--json', '--ignore-scripts']
      : ['pack', '--json', '--ignore-scripts', '--pack-destination', directory];
    const result = parsePackOutput(
      execFileSync('npm', args, {
        cwd,
        encoding: 'utf8',
      }),
      manifest.name
    );
    assert.equal(result.name, manifest.name);
    assert.equal(result.version, manifest.version);
    if (artifact) assert.equal(result.integrity, artifact.integrity);
    const files = new Set(result.files.map(({ path: file }) => file));
    for (const file of [
      'dist/index.cjs.js',
      'dist/index.mjs',
      'dist/index.node.mjs',
      'dist/index.esm.js',
      'dist/index.umd.js',
      'dist/index.d.ts',
      'dist/index.d.mts',
      'dist/LICENSE',
    ]) {
      assert.ok(files.has(file), `${manifest.name} is missing ${file}`);
    }
    assert.ok(
      ![...files].some(
        (file) => file.startsWith('test/') || file.startsWith('build/')
      )
    );
    dependencies[manifest.name] =
      `file:${artifactFile ?? path.join(directory, result.filename)}`;
  }
  // Install the application peers at the versions verified in the workspace.
  const piniaPackage = packages.find(
    ({ manifest }) => manifest.name === 'usm-pinia'
  );
  for (const name of ['vue', '@vue/devtools-api']) {
    const peerManifest = JSON.parse(
      readFileSync(
        path.join(piniaPackage.cwd, 'node_modules', name, 'package.json'),
        'utf8'
      )
    );
    dependencies[name] = peerManifest.version;
  }
  writeFileSync(
    path.join(directory, 'package.json'),
    JSON.stringify({ private: true, dependencies })
  );
  execFileSync(
    'npm',
    ['install', '--ignore-scripts', '--no-audit', '--no-fund'],
    { cwd: directory, stdio: 'inherit' }
  );
  const require = createRequire(path.join(directory, 'package.json'));
  const importer = path.join(directory, 'importer.mjs');
  writeFileSync(importer, 'export const load = (name) => import(name);\n');
  const { load } = await import(pathToFileURL(importer).href);
  for (const { manifest } of packages) {
    const cjs = require(manifest.name);
    const nodeEsm = await load(manifest.name);
    for (const key of Object.keys(cjs)) {
      assert.equal(
        nodeEsm[key],
        cjs[key],
        `${manifest.name}: Node import/require identity for ${key}`
      );
    }
    const esm = await import(
      pathToFileURL(
        path.join(directory, 'node_modules', manifest.name, 'dist/index.mjs')
      ).href
    );
    const umd = require(`${manifest.name}/dist/index.umd.js`);
    // Exercise the browser branch too: require(UMD) cannot catch incorrect
    // external global names. Load the upstream CDN builds without Node globals.
    const browser = vm.createContext({ console });
    const runBrowserScript = (name, file) =>
      vm.runInContext(
        readFileSync(
          path.join(directory, 'node_modules', name, 'dist', file),
          'utf8'
        ),
        browser
      );
    if (manifest.dependencies.mutative) {
      runBrowserScript('mutative', 'mutative.umd.production.min.js');
    }
    if (manifest.dependencies.redux) {
      // Redux 5 ships browser ESM. Bundle that entry into the namespace a
      // script-tag consumer must provide, keeping every object in one realm.
      const bundle = await Rolldown.rolldown({
        input: path.join(
          directory,
          'node_modules/redux/dist/redux.browser.mjs'
        ),
        platform: 'browser',
      });
      try {
        const { output } = await bundle.generate({
          format: 'iife',
          name: 'Redux',
        });
        vm.runInContext(output[0].code, browser);
      } finally {
        await bundle.close();
      }
    }
    if (manifest.dependencies.mobx) {
      runBrowserScript('mobx', 'mobx.umd.production.min.js');
    }
    if (manifest.dependencies.pinia || manifest.dependencies.vuex) {
      runBrowserScript('vue', 'vue.global.prod.js');
      if (manifest.dependencies.pinia) {
        runBrowserScript('pinia', 'pinia.iife.prod.js');
      } else {
        runBrowserScript('vuex', 'vuex.global.prod.js');
      }
    }
    runBrowserScript(manifest.name, 'index.umd.js');
    const globalName = manifest.name.replace(/-(\w)/g, (_, letter) =>
      letter.toUpperCase()
    );
    const browserUmd = browser[globalName];
    assert.deepEqual(Object.keys(esm).sort(), Object.keys(cjs).sort());
    assert.deepEqual(Object.keys(umd).sort(), Object.keys(cjs).sort());
    assert.deepEqual(Object.keys(browserUmd).sort(), Object.keys(cjs).sort());
    for (const [format, api] of Object.entries({ cjs, esm, umd, browserUmd })) {
      class Counter {
        constructor() {
          this.count = 0;
        }
        increase() {
          this.count += 1;
        }
      }
      api.state(Counter.prototype, 'count');
      Object.defineProperty(
        Counter.prototype,
        'increase',
        api.action(
          Counter.prototype,
          'increase',
          Object.getOwnPropertyDescriptor(Counter.prototype, 'increase')
        )
      );
      const counter = new Counter();
      const store = api.createStore({ modules: [counter], strict: true });
      let notifications = 0;
      const unsubscribe = store.subscribe(() => {
        notifications += 1;
      });
      counter.increase();
      assert.equal(counter.count, 1, `${manifest.name} ${format}`);
      assert.equal(Object.values(store.getState())[0].count, 1);
      assert.equal(notifications, 1);
      if (manifest.name === 'usm-pinia') {
        await (format === 'browserUmd'
          ? browser.Vue.nextTick()
          : require('vue').nextTick());
        assert.equal(
          notifications,
          1,
          `${manifest.name} ${format}: duplicate action notification`
        );
      }
      unsubscribe();
      console.log(`${manifest.name} ${format}: passed`);
    }
  }
  // Check the installed declarations through both Node resolution modes.
  const consumer = packages
    .map(
      ({ manifest }, index) =>
        `import { createStore as createStore${index} } from '${manifest.name}';\ncreateStore${index}({ modules: [], strict: true });`
    )
    .join('\n');
  for (const extension of ['cts', 'mts']) {
    const file = path.join(directory, `consumer.${extension}`);
    writeFileSync(file, consumer);
    execFileSync(
      path.join(root, 'node_modules/.bin/tsc'),
      [
        '--noEmit',
        '--strict',
        '--target',
        'ES2018',
        '--lib',
        'ES2025,DOM',
        '--module',
        'NodeNext',
        '--moduleResolution',
        'NodeNext',
        file,
      ],
      { cwd: directory, stdio: 'inherit' }
    );
  }
  console.log('All packed packages passed runtime and declaration checks.');
} finally {
  rmSync(directory, { recursive: true, force: true });
}
