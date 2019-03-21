import '../with-tsconfig-a/should-error';

// describe should be available in `test`,
// due to "types": [ "mocha" ] in tsconfig
export const testExport = typeof describe !== 'undefined' ? describe : undefined;
