// verify named imports
import { platform } from 'node:os';
console.log(`Current platform is: ${platform()}`);

// verify interop without config
import path from 'node:path';
console.log(`Path separator is: ${path.sep}`);
