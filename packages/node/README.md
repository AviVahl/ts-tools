# @ts-tools/node

[![npm version](https://img.shields.io/npm/v/@ts-tools/node.svg)](https://www.npmjs.com/package/@ts-tools/node)

[TypeScript](https://www.typescriptlang.org/) support for [Node.js](https://nodejs.org/en/).

This package installs a [require extension](https://nodejs.org/dist/latest-v12.x/docs/api/modules.html#modules_require_extensions), adding support for running `.ts` and `.tsx` files directly from source.

Features:

- Fast! Uses `ts.transpileModule`. Leaves type checking to other flows.
- Uses persistent disk caching (`./node_modules/.cache/ts-<module>-<target>`). Second run will not re-transpile a file if not changed.
- Built-in support for **source-maps**, powered by [source-map-support](https://github.com/evanw/node-source-map-support).
- Node 8+ **friendly** default compiler options.

## Getting started

Install the library as a dev dependency in an existing TypeScript project:

```
npm i @ts-tools/node --save-dev
```

Usage with [Node.js](https://nodejs.org/en/):

```
node -r @ts-tools/node/r ./my-script.ts
```

Usage with [Mocha](https://github.com/mochajs/mocha):

```
mocha -r @ts-tools/node/r "./test/**/*.unit.ts?(x)" --watch-extensions ts,tsx
```

OR, create a `.mocharc.js` file with:

```js
module.exports = {
  require: ['@ts-tools/node/r'],
  extension: ['js', 'json', 'ts', 'tsx'],
};
```

Usage with [Visual Studio Code](https://github.com/Microsoft/vscode):

```jsonc
// in .vscode/launch.json, under "configurations"
{
  "type": "node",
  "request": "launch",
  "name": "Launch Program",
  "runtimeArgs": ["-r", "@ts-tools/node/r"],
  "args": ["${workspaceFolder}/src/my-script.ts"]
}
```

## Similar projects

[ts-node](https://github.com/TypeStrong/ts-node) - a much more complete solution. It includes a `ts-node` cli/repl, and require hook registration.

## License

MIT
