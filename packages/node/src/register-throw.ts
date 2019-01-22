import { defaultTranspileOptions } from './constants'
import { registerNodeExtension } from './register-node-extension'

registerNodeExtension({
    onDiagnostics(diagnosticsText) {
        throw new Error(diagnosticsText)
    },
    transpileOptions: defaultTranspileOptions
})
