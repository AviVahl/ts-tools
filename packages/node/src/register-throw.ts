import {registerNodeExtension, formatDiagnostics} from './register-node-extension'

registerNodeExtension(function throwDiagnostics(diagnostics) {
    throw new Error(formatDiagnostics(diagnostics))
})
