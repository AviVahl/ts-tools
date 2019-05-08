import assert from 'assert';
import { readFileSync } from 'fs';

const actualContents = readFileSync(require.resolve('@types/react/index.d.ts'), 'utf8');
const reactDts = require('@types/react/index.d.ts');

assert.equal(reactDts.default, actualContents);
assert.ok(reactDts.__esModule);
