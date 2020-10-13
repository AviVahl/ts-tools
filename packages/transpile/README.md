# @ts-tools/transpile

[![npm version](https://img.shields.io/npm/v/@ts-tools/transpile.svg)](https://www.npmjs.com/package/@ts-tools/transpile)

TypeScript transpilation helpers.

## Getting started

Install the library in an existing TypeScript project:

```
npm i @ts-tools/transpile
```

Then, import its programmatic API to use:

```ts
import { transpileCached } from '@ts-tools/transpile';

const { outputText, sourceMapText } = transpileCached({
  fileName: '/project/src/file.ts',
  cachedDirectoryPath: '/project/node_modules/.cache/whatever',
});
```

## License

MIT
