# @ts-tools/service

[![npm version](https://img.shields.io/npm/v/@ts-tools/service.svg)](https://www.npmjs.com/package/@ts-tools/service)

An on-demand [TypeScript](https://www.typescriptlang.org/) transpilation service.

Features:

- Full syntactic and semantic **type checking**.
- Automatically searches for and loads the closest `tsconfig`.
- Ability to force specific `compilerOptions`, no matter which `tsconfig` loads.
- Reuses existing services, if relevant, for transpilation of new files.
- Supports custom current working directory, per config.
- Supports specifying custom transformers, per config.
- Allows usage of custom file systems, setting up everything required around it.
- Uses isolated module transpilation when no `tsconfig` is found.

## License

MIT
