const { createNodeExtension } = require('@ts-tools/node');

const nodeExtension = createNodeExtension({ configFilePath: require.resolve('./tsconfig.tsc-init.json') });
require.extensions['.ts'] = nodeExtension;
require.extensions['.tsx'] = nodeExtension;
