import { createNodeExtension } from './node-extension';

const nodeExtension = createNodeExtension();
require.extensions['.ts'] = nodeExtension;
require.extensions['.tsx'] = nodeExtension;
