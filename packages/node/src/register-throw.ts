import { registerNodeExtension } from './register-node-extension'

registerNodeExtension(function throwDiagnostics(diagnosticsText) {
    throw new Error(diagnosticsText)
})
