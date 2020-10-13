# @ts-tools/build

[![npm version](https://img.shields.io/npm/v/@ts-tools/build.svg)](https://www.npmjs.com/package/@ts-tools/build)

CLI for easier building of multi-target [TypeScript](https://www.typescriptlang.org/) libraries.

Features:

- Full syntactic and semantic **type checking**.
- Compilation to both CommonJS and ESM module formats in a single run.

## Getting started

Install the library as a dev dependency in an existing TypeScript project:

```
npm i @ts-tools/build --save-dev
```

In project's `package.json`:

```json
{
  "scripts": {
    "build": "ts-build ./src --cjs --esm"
  }
}
```

When wanting to build, run:

```
npm run build
```

## License

MIT
