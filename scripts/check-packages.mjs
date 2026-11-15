import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { publint } from 'publint';
import { packages, root } from './packages.mjs';

const directory = mkdtempSync(path.join(tmpdir(), 'usm-packages-'));
try {
  const dependencies = {};
  for (const { cwd, manifest } of packages) {
    const { messages } = await publint({ pkgDir: cwd, strict: true });
    assert.equal(messages.length, 0, `${manifest.name}: ${JSON.stringify(messages)}`);
    const result = JSON.parse(execFileSync('npm', ['pack', '--json', '--pack-destination', directory], { cwd, encoding: 'utf8' }))[0];
    const files = new Set(result.files.map(({ path: file }) => file));
    for (const file of ['dist/index.cjs.js', 'dist/index.mjs', 'dist/index.esm.js', 'dist/index.umd.js', 'dist/index.d.ts', 'dist/index.d.mts', 'dist/LICENSE']) {
      assert.ok(files.has(file), `${manifest.name} is missing ${file}`);
    }
    assert.ok(![...files].some((file) => file.startsWith('test/') || file.startsWith('build/')));
    dependencies[manifest.name] = `file:${path.join(directory, result.filename)}`;
  }
  // Vue is a peer of Vuex and Pinia; install it just as an application would.
  dependencies.vue = '3.5.22';
  writeFileSync(path.join(directory, 'package.json'), JSON.stringify({ private: true, dependencies }));
  execFileSync('npm', ['install', '--ignore-scripts', '--no-audit', '--no-fund'], { cwd: directory, stdio: 'inherit' });
  const require = createRequire(path.join(directory, 'package.json'));
  for (const { manifest } of packages) {
    const cjs = require(manifest.name);
    const esm = await import(pathToFileURL(path.join(directory, 'node_modules', manifest.name, 'dist/index.mjs')).href);
    const umd = require(`${manifest.name}/dist/index.umd.js`);
    assert.deepEqual(Object.keys(esm).sort(), Object.keys(cjs).sort());
    assert.deepEqual(Object.keys(umd).sort(), Object.keys(cjs).sort());
    for (const [format, api] of Object.entries({ cjs, esm, umd })) {
      class Counter {
        constructor() { this.count = 0; }
        increase() { this.count += 1; }
      }
      api.state(Counter.prototype, 'count');
      Object.defineProperty(Counter.prototype, 'increase', api.action(Counter.prototype, 'increase', Object.getOwnPropertyDescriptor(Counter.prototype, 'increase')));
      const counter = new Counter();
      const store = api.createStore({ modules: [counter], strict: true });
      let notifications = 0;
      const unsubscribe = store.subscribe(() => { notifications += 1; });
      counter.increase();
      assert.equal(counter.count, 1, `${manifest.name} ${format}`);
      assert.equal(Object.values(store.getState())[0].count, 1);
      assert.equal(notifications, 1);
      unsubscribe();
      console.log(`${manifest.name} ${format}: passed`);
    }
  }
  // Check the installed declarations through both Node resolution modes.
  const consumer = packages.map(({ manifest }, index) =>
    `import { createStore as createStore${index} } from '${manifest.name}';\ncreateStore${index}({ modules: [], strict: true });`
  ).join('\n');
  for (const extension of ['cts', 'mts']) {
    const file = path.join(directory, `consumer.${extension}`);
    writeFileSync(file, consumer);
    execFileSync(path.join(root, 'node_modules/.bin/tsc'), ['--noEmit', '--strict', '--target', 'ES2018', '--lib', 'ES2025,DOM', '--module', 'NodeNext', '--moduleResolution', 'NodeNext', file], { cwd: directory, stdio: 'inherit' });
  }
  console.log('All packed packages passed runtime and declaration checks.');
} finally {
  rmSync(directory, { recursive: true, force: true });
}
