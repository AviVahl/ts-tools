// verify named imports
import { platform } from 'os';
console.log(`Current platform is: ${platform()}`);

// verify interop without config
import path from 'path';
console.log(`Path separator is: ${path.sep}`);
