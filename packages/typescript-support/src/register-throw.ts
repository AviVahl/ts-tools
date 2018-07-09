import {registerNodeExtension, formatDiagnostics} from './register-typescript'

registerNodeExtension(function throwDiagnostics(diagnostics) {
    throw new Error(formatDiagnostics(diagnostics))
})
