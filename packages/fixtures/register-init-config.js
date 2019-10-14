const { join } = require('path');
const { createNodeExtension } = require('@ts-tools/node');

const nodeExtension = createNodeExtension({ configFilePath: join(__dirname, 'tsconfig.tsc-init.json') });
require.extensions['.ts'] = nodeExtension;
require.extensions['.tsx'] = nodeExtension;
