# @ts-tools/node-hooks [![npm version](https://img.shields.io/npm/v/@ts-tools/node-hooks)](https://www.npmjs.com/package/@ts-tools/node-hooks)

[TypeScript](https://www.typescriptlang.org/) support for [Node.js](https://nodejs.org/en/).

This package exposes [node hooks](https://nodejs.org/docs/latest-v26.x/api/module.html#customization-hooks), adding support for running `.ts` and `.tsx` files directly from source, in native esm mode.

Features:

- Fast! Uses `transpileModule`. Leaves type checking to other flows.
- Source maps work with Node's `--enable-source-maps`, and when setting breakpoints directly on `.ts/.tsx` sources.

## Getting started

Install the library as a dev dependency in an existing TypeScript project:

```
npm i @ts-tools/node-hooks --save-dev
```

Usage with [Node.js](https://nodejs.org/en/):

```
node --import @ts-tools/node-hooks ./my-script.ts
```

## Default Hooks

`@ts-tools/node-hooks` main entrypoint registers the default hooks.

It uses the following compiler options:

```ts
const compilerOptions: ts.CompilerOptions = {
  target: tsAst.ScriptTarget.ESNext,
  inlineSourceMap: true,
  module: ts.ModuleKind.NodeNext,
  moduleResolution: ts.ModuleResolutionKind.NodeNext,
  jsx: ts.JsxEmit.ReactJSX,
};
```

## Custom Hooks

`@ts-tools/node-hooks/lib` (notice the `/lib`) exposes a programmatic API, which can be used to create custom hooks:

```ts
import { registerHooks } from 'node:module';
import { dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHooks, loadTsconfig } from '@ts-tools/node-hooks/lib';

const tsconfigPath = fileURLToPath(new URL('./my-custom-tsconfig.json', import.meta.url));

registerHooks(
  createHooks({
    compilerOptions: loadTsconfig(tsconfigPath),
    cwd: dirname(tsconfigPath),
  }),
);
```

## License

MIT
