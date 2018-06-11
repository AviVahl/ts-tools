import * as sourceMapSupport from 'source-map-support'
import { NodeTypeScriptService } from './node-ts-service'
// import chalk from 'chalk'

// // Used for printing error messages
// const { red } = chalk

// our service
const nodeTsService = new NodeTypeScriptService()

// connects source maps of the service to source-map-support
sourceMapSupport.install({
    environment: 'node',
    retrieveSourceMap: (filePath) => {
        const fileSourceMap = nodeTsService.sourceMaps.get(filePath)
        return fileSourceMap ? { map: fileSourceMap, url: filePath } : null
    }
})

// our require extension transpiles the file to js using the service
// and then runs the resulting js like any regular js
function requireExtension(nodeModule: NodeModule, filePath: string): void {
    const { outputCode, error } = nodeTsService.transpile(filePath)
    if (error) {
        throw error
    }
    nodeModule._compile(outputCode, filePath)
}

// register our extension for the two default supported extensions
require.extensions['.ts'] = require.extensions['.tsx'] = requireExtension
