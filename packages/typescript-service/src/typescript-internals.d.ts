import ts from 'typescript'

// define this type outside `declare module` to have access to native Map
// typescript has its own Map interface, which is not iterable using for-const-of
// actual implementation uses native Map, so this is safe
type ResolvedModules = Map<string, ts.ResolvedModuleFull | undefined>

declare module 'typescript' {
    // needed for custom readDirectory
    export function matchFiles(
        path: string,
        extensions: ReadonlyArray<string> | undefined,
        excludes: ReadonlyArray<string> | undefined,
        includes: ReadonlyArray<string> | undefined,
        useCaseSensitiveFileNames: boolean,
        currentDirectory: string, depth: number | undefined,
        getFileSystemEntries: (path: string) => FileSystemEntries
    ): string[]

    // used by matchFiles above
    export interface FileSystemEntries {
        files: ReadonlyArray<string>
        directories: ReadonlyArray<string>
    }

    // needed to resolve newLine, while taking compilerOptions into consideration, for each `LanguageServiceHost`
    export function getNewLineCharacter(
        options: ts.CompilerOptions | ts.PrinterOptions,
        getNewLine?: () => string
    ): string

    // dirname, typescript version (slashes normalized to posix-style). needed for default baseHost.
    export function getDirectoryPath(path: string): string

    export interface SourceFile {
        resolvedModules?: ResolvedModules
    }
}
