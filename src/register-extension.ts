import { install } from 'source-map-support'
import { TypeScriptNodeExtension } from './ts-node-extension'
import { sourceMaps } from './global-state'

// register our handler for the two supported extensions
require.extensions['.ts'] = require.extensions['.tsx'] = TypeScriptNodeExtension

install({
    environment: 'node',
    retrieveSourceMap(filePath): any /* Until PR to DefinitelyTyped is merged */ {
        const fileSourceMap = sourceMaps.get(filePath)
        return fileSourceMap ? { map: fileSourceMap, url: filePath } : null
    }
})
