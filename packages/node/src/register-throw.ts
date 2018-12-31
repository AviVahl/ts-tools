import { registerNodeExtension } from './register-node-extension'

const { tsService, sourceMaps } = registerNodeExtension(function throwDiagnostics(diagnosticsText) {
    throw new Error(diagnosticsText)
})

export { tsService, sourceMaps }
