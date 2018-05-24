# node-typescript-support
[![npm version](https://badge.fury.io/js/node-typescript-support.svg)](https://www.npmjs.com/package/node-typescript-support)
[![Build Status](https://travis-ci.com/AviVahl/node-typescript-support.svg?branch=master)](https://travis-ci.com/AviVahl/node-typescript-support)

TypeScript support for Node.js.

Features:
- Node.js require extension that adds support for running `.ts` and `.tsx` files directly.
- Full syntactic and semantic type checking, powered by `TypeScript`.
- Loads configuration from the closest `tsconfig.json`, with support for multiple configurations inside a project.
- Built-in support for source-maps, powered by `source-map-support`.
- Sane defaults and basic transpilation, when no `tsconfig.json` is found.

## Getting started

Install the library as a dev dependency in an existing TypeScript project:
```sh
yarn add node-typescript-support --dev
```

Then, use it as follows:
```sh
node -r node-typescript-support/register ./my-script.ts
```

Or, in your code:
```ts
import 'node-typescript-support/register';
```

## Why?

I recently experimented with a neat project setup where I have one
`tsconfig.json` in my `src` folder, and a second `tsconfig.json`
in my `test` folder.

Each config created a different type environment by explicitly
specifying which `@types` packages are included (via compilerOptions->types).

So while my tests had access to `@types/mocha` and its globals, my
`src` folder knew nothing of `describe()` and `it()`.

The above setup gave me type isolation between folders sharing
the same `node_modules`.

For better development velocity, I quickly wanted a TypeScript Node.js
integration that supports this setup, and would give me proper
type checking per environment. This led to this library.

## How?

The `node-typescript-support/register` end-point registers this library's
`TypeScriptNodeExtension` for the `.ts` and `.tsx` file extensions.
It uses `require.extensions` to do so.

For each `.ts` or `.tsx` file, the extension finds the closest `tsconfig.json`.
For each config, it instantiates a separate TypeScript Language Service and
uses that service to transpile and type-check the file.

`tsconfig.json` lookup is done once per directory (cached for the second
lookup in that directory). There is one Language Service per `tsconfig.json`,
and all running services share a document registry.

If no `tsconfig.json` is found for a typescript file,
this integration transpiles it directly using the following
Node 8+ friendly compiler options:

```ts
export const defaultCompilerOptions: ts.CompilerOptions = {
    target: ts.ScriptTarget.ES2017,
    module: ts.ModuleKind.CommonJS,
    jsx: ts.JsxEmit.React
    moduleResolution: ts.ModuleResolutionKind.NodeJs,
    sourceMap: true
}
```
## Custom registration

If you don't want source maps turned on, or prefer registering
the extension in your code, it can be imported via the package root:

```ts
import { TypeScriptNodeExtension } from 'node-typescript-support'

require.extensions['.ts'] = TypeScriptNodeExtension
```

## License

MIT
