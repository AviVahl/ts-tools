import { NodeTypeScriptService } from './node-ts-service'

// default handling uses default options and installs source-map-support
const nodeTsService = new NodeTypeScriptService()
nodeTsService.installSourceMapSupport()

// register our handler for the two default supported extensions
require.extensions['.ts'] = require.extensions['.tsx'] = nodeTsService.requireExtension
