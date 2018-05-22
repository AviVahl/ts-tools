import { TypeScriptNodeExtension } from './ts-node-extension'

// register our handler for the two supported extensions
require.extensions['.ts'] = require.extensions['.tsx'] = TypeScriptNodeExtension
