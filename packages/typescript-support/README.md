# typescript-support
[![npm version](https://badge.fury.io/js/typescript-support.svg)](https://www.npmjs.com/package/typescript-support)

[TypeScript](https://www.typescriptlang.org/) support for [Node.js](https://nodejs.org/en/).

This package installs a [require extension](https://nodejs.org/dist/latest-v8.x/docs/api/modules.html#modules_require_extensions), adding support for running `.ts` and `.tsx` files directly.

Features:
- Full syntactic and semantic **type checking**.
- Loads configuration from the closest `tsconfig.json`, with support for **multiple configurations** inside a project.
- Built-in support for **source-maps**, powered by [source-map-support](https://github.com/evanw/node-source-map-support).
- Node 8+ **friendly** defaults, for basic transpilation when no `tsconfig.json` is found.

## Getting started

Install the library as a dev dependency in an existing TypeScript project:
```
yarn add typescript-support --dev
```

Usage with [Node.js](https://nodejs.org/en/):
```
node -r typescript-support ./my-script.ts
```

Usage with [Mocha](https://github.com/mochajs/mocha):
```
mocha -r typescript-support "./test/**/*.unit.ts?(x)" --watch-extensions ts,tsx
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
        "typescript-support"
    ],
    "args": [
        "${workspaceFolder}/src/my-script.ts"
    ]
}
```

If throwing on type errors is too invasive to your development process,
you can use an alternative entry point that calls `console.warn()` instead:
```
node -r typescript-support/warn ./my-script.ts
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

For each `.ts` or `.tsx` file, the extension finds the closest `tsconfig.json`.
For each config, it instantiates a separate TypeScript Language Service and
uses that service to transpile and type-check the file.

`tsconfig.json` lookup is done once per directory (cached for the second
lookup in that directory). There is one Language Service per `tsconfig.json`,
and all running services share a document registry.

If no `tsconfig.json` is found for a typescript file,
this integration transpiles it directly using the Node 8+ friendly compiler options.

## Similar projects

[ts-node](https://github.com/TypeStrong/ts-node) - a much more complete solution. It includes a `ts-node` cli/repl, and require hook registeration. It does not support multiple tsconfigs out of the box, afaik. 

## License

MIT
