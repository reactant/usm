import { spawnSync } from 'node:child_process';
import { createRequire } from 'node:module';
import path from 'node:path';

const require = createRequire(import.meta.url);
const mode = process.argv[2];
if (!['development', 'production'].includes(mode)) {
  throw new Error(`Unsupported test mode: ${mode}`);
}
const cli = path.join(path.dirname(require.resolve('vitest/package.json')), 'vitest.mjs');
const result = spawnSync(process.execPath, [cli, 'run', ...process.argv.slice(3)], {
  stdio: 'inherit',
  env: { ...process.env, NODE_ENV: mode },
});
if (result.error) throw result.error;
process.exit(result.status ?? 1);
