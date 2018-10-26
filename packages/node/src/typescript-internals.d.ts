import { ResolvedModuleFull } from 'typescript'

type NativeMap<K, V> = Map<K, V>

// augmenting typescript
declare module 'typescript' {
    export interface SourceFile {
        // we use it to remap imports/re-exports to the actual module they point to
        // this allows low-overhead baseUrl/paths support, as we do not have to re-resolve requests
        resolvedModules?: NativeMap<string, ResolvedModuleFull | undefined>
    }
}

