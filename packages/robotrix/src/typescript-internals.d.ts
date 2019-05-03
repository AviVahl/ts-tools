import ts from 'typescript';

// define this type outside `declare module` to have access to native map
// typescript has its own Map interface, which is no iterable using for-const-of
// actual implementation uses native Map, so this is safe
type ResolvedModules = Map<string, ts.ResolvedModuleFull | undefined>;

// augmenting typescript
declare module 'typescript' {
    export interface SourceFile {
        // we use it to remap imports/re-exports to the actual module they point to
        // this allows low-overhead baseUrl/paths support, as we do not have to re-resolve requests
        resolvedModules?: ResolvedModules;
    }
}
