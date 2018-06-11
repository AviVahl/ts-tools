import * as ts from 'typescript'

export enum TranspilationErrorType {
    SEMANTIC = 'Semantic Errors',
    SYNTACTIC = 'Syntactic Errors',
    CONFIG_PARSE = 'Config Parse Errors',
    TRANSPILATION = 'Transpilation Errors',
}

export class TranspilationError extends Error {
    constructor(
        public type: TranspilationErrorType,
        public filePath: string,
        public originalMessage: string,
        public originalDiagnostics?: ts.Diagnostic[]
    ) {
        super(`${type} in ${filePath}:\n${originalMessage}`)

        // needed to restore prototype chain of Error
        // See: https://www.typescriptlang.org/docs/handbook/release-notes/typescript-2-2.html
        // "Support for new.target" section
        Object.setPrototypeOf(this, new.target.prototype)
    }
}
