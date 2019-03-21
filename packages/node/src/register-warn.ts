import { defaultTranspileOptions } from './constants';
import { registerNodeExtension } from './register-node-extension';

registerNodeExtension({
    onDiagnostics(diagnosticsText) {
        console.warn(diagnosticsText); // tslint:disable-line:no-console
    },
    transpileOptions: defaultTranspileOptions
});
