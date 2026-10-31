// @ts-check

import fs from 'node:fs';
import path from 'node:path';

const packagesDirectory = path.join(import.meta.dirname, '../packages');

for (const packageName of fs.readdirSync(packagesDirectory)) {
  fs.rmSync(path.join(packagesDirectory, packageName, 'dist'), { recursive: true, force: true });
}
