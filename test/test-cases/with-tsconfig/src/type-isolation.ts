// describe should not be available in `src`,
// due to "types": [] in tsconfig
export const testExport = typeof describe !== 'undefined' ? describe : undefined
