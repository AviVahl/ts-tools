import { registerNodeExtension } from './register-node-extension'

registerNodeExtension(diagnosticsText => {
    // tslint:disable-next-line:no-console
    console.warn(diagnosticsText)
})
