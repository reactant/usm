import { rmSync } from 'node:fs';
import path from 'node:path';
import { packages } from './packages.mjs';

for (const { cwd } of packages) {
  for (const directory of ['dist', 'build']) {
    rmSync(path.join(cwd, directory), { recursive: true, force: true });
  }
}
