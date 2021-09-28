# @ts-tools/esm

[![npm version](https://img.shields.io/npm/v/@ts-tools/esm.svg)](https://www.npmjs.com/package/@ts-tools/esm)

[TypeScript](https://www.typescriptlang.org/) support for [Node.js](https://nodejs.org/en/).

This package exposes an [esm loader](https://nodejs.org/docs/latest-v16.x/api/esm.html#esm_loaders), adding support for running `.ts` and `.tsx` files directly from source, in native esm mode.

Features:

- Fast! Uses `ts.transpileModule`. Leaves type checking to other flows.
- Searches for the closest `tsconfig.json`, and adjusts it as necessary for native esm execution.
- Source maps work with Node's `--enable-source-maps`, and when setting breakpoints directly on `.ts/.tsx` sources.

## Getting started

Install the library as a dev dependency in an existing TypeScript project:

```
npm i @ts-tools/esm --save-dev
```

Usage with [Node.js](https://nodejs.org/en/):

```
node --experimental-loader @ts-tools/esm ./my-script.ts
```

## Default Loader

`@ts-tools/esm` main entrypoint exposes the default loader, which searches for the closest `tsconfig.json`
to the current working directory.

If found, it is loaded and adjusted for direct esm execution.

If a `tsconfig.json` file is not found, the following `compilerOptions` are used:
```ts
const defaultCompilerOptions: ts.CompilerOptions = {
  module: ts.ModuleKind.ESNext,
  target: ts.ScriptTarget.ES2020,
  inlineSourceMap: true,
  moduleResolution: ts.ModuleResolutionKind.NodeJs,
  jsx: ts.JsxEmit.React,
}
```

## Custom Loader

`@ts-tools/esm/lib` (notice the `/lib`) exposes a programmatic API, which can be used to create a custom loader:

```ts
import { dirname } from 'path';
import { fileURLToPath } from 'url';
import { createLoader, loadTsconfig } from '@ts-tools/esm/lib';

const tsconfigPath = fileURLToPath(new URL('./my-custom-tsconfig.json', import.meta.url));

const { resolve, getFormat, transformSource } = createLoader({
  compilerOptions: loadTsconfig(tsconfigPath),
  cwd: dirname(tsconfigPath),
});

export { resolve, getFormat, transformSource };
```

## License

MIT