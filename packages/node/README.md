# @ts-tools/node
[![npm version](https://img.shields.io/npm/v/@ts-tools/node.svg)](https://www.npmjs.com/package/@ts-tools/node)

[TypeScript](https://www.typescriptlang.org/) support for [Node.js](https://nodejs.org/en/).

This package installs a [require extension](https://nodejs.org/dist/latest-v8.x/docs/api/modules.html#modules_require_extensions), adding support for running `.ts` and `.tsx` files directly.

Features:
- Full syntactic and semantic **type checking**.
- Loads configuration from the closest `tsconfig.json`, with support for **multiple configurations** inside a project.
- Built-in support for **source-maps**, powered by [source-map-support](https://github.com/evanw/node-source-map-support).
- Built-in support for **baseUrl** and **paths** by using a custom transformer that remaps imports.
- Node 8+ **friendly** defaults, for basic transpilation when no `tsconfig.json` is found.

## Getting started

Install the library as a dev dependency in an existing TypeScript project:
```
yarn add @ts-tools/node --dev
```

Usage with [Node.js](https://nodejs.org/en/):
```
node -r @ts-tools/node/r ./my-script.ts
```

Usage with [Mocha](https://github.com/mochajs/mocha):
```
mocha -r @ts-tools/node/r "./test/**/*.unit.ts?(x)" --watch-extensions ts,tsx
```

Usage with [Visual Studio Code](https://github.com/Microsoft/vscode):
```jsonc
// in .vscode/launch.json, under "configurations"
{
    "type": "node",
    "request": "launch",
    "name": "Launch Program",
    "runtimeArgs": [
        "-r",
        "@ts-tools/node/r"
    ],
    "args": [
        "${workspaceFolder}/src/my-script.ts"
    ]
}
```

## Entry points

Package provides the following entry points:

### `@ts-tools/node/r` (recommended)

- Type checking.
- Throws diagnostics.

### `@ts-tools/node/warn`

Same as `/r`, but uses `console.warn()` for diagnostics.

### `@ts-tools/node/ci-safe-warn`

Same as `/warn`, but uses `/r` in CIs.

### `@ts-tools/node/fast`

- No type checking.
- No **baseUrl** and **paths** support.
- Uses `console.warn()` for diagnostics.

### `@ts-tools/node/ci-safe-fast`

Same as `/fast`, but uses `/r` in CIs.

## Known limitations

- The following `compilerOptions` are not supported:
  - `allowJs` and `checkJs` (only `.ts/.tsx` files are hooked).
  - `composite` projects.

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

For each `.ts` or `.tsx` file, the extension finds the closest `tsconfig.json`.
For each config, it instantiates a separate TypeScript Language Service and
uses that service to transpile and type-check the file.

`tsconfig.json` lookup is done once per directory (cached for the second
lookup in that directory). There is one Language Service per `tsconfig.json`,
and all running services share a document registry.

If no `tsconfig.json` is found for a typescript file,
this integration transpiles it directly using the Node 8+ friendly compiler options.

## Similar projects

[ts-node](https://github.com/TypeStrong/ts-node) - a much more complete solution. It includes a `ts-node` cli/repl, and require hook registration. It does not support multiple tsconfigs out of the box, afaik. 

## License

MIT
