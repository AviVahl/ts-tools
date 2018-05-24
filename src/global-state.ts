import * as ts from 'typescript'

// we might create more than a single language service during a run, so we share documents between them
export const sharedDocumentRegistry = ts.createDocumentRegistry(
    ts.sys.useCaseSensitiveFileNames,
    ts.sys.getCurrentDirectory()
)

// a map holding `tsconfig path` to a `language service`
export const runningServices = new Map<string, ts.LanguageService>()

// cache of `directory path` to `tsconfig lookup result`, to save disk operations
export const directoryToTsConfig = new Map<string, string | undefined>()

// a map holding `file path` to its `matching source maps`
export const sourceMaps = new Map<string, string>()
