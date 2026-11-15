import { readdirSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

export const root = fileURLToPath(new URL('../', import.meta.url));
export const packages = readdirSync(path.join(root, 'packages'))
  .sort()
  .map((directory) => {
    const cwd = path.join(root, 'packages', directory);
    const manifest = JSON.parse(
      readFileSync(path.join(cwd, 'package.json'), 'utf8')
    );
    return { cwd, manifest };
  })
  .filter(({ manifest }) => !manifest.private);
