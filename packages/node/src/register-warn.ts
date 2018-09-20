import { registerNodeExtension, formatDiagnostics } from './register-node-extension'

registerNodeExtension(diagnostics => {
    // tslint:disable-next-line:no-console
    console.warn(formatDiagnostics(diagnostics))
})
