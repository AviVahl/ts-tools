import sourceMapSupport from 'source-map-support'
import { TypeScriptService } from '@ts-tools/service'

export const packageState = {
    /**
     * is the node extension currently registered.
     */
    registered: false,

    /**
     * service used by the extension to transpile files.
     */
    tsService: new TypeScriptService(),

    /**
     * source map cache.
     */
    sourceMaps: new Map<string, string>()
}

// connects source maps cache to source-map-support
sourceMapSupport.install({
    environment: 'node',
    retrieveSourceMap(filePath) {
        const fileSourceMap = packageState.sourceMaps.get(filePath)
        return fileSourceMap ? { map: Buffer.from(fileSourceMap, 'base64').toString(), url: filePath } : null
    }
})
