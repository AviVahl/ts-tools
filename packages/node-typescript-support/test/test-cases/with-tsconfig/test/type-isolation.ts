import '../src/type-isolation'

// describe should be available in `test`,
// due to "types": [ "mocha" ] in tsconfig
export const testExport = typeof describe !== 'undefined' ? describe : undefined
