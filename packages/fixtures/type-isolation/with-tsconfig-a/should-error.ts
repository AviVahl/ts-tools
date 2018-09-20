// describe should not be available in this folder
// due to "types": [] in tsconfig

export const testExport = typeof describe !== 'undefined' ? describe : undefined
