import { registerNodeExtension } from './register-node-extension'

const { tsService, sourceMaps } = registerNodeExtension(diagnosticsText => {
    // tslint:disable-next-line:no-console
    console.warn(diagnosticsText)
})

export { tsService, sourceMaps }
