# @ts-tools/typescript-service
[![npm version](https://badge.fury.io/js/@ts-tools/typescript-service.svg)](https://www.npmjs.com/package/@ts-tools/typescript-service)

A service for on-demand transpilation of TypeScript source files.

Features:
- Configuration loading from `tsconfig.json` files.
- Automatically searches for the closest `tsconfig.json`, and loads a language service for complete syntactic/semantic type checking.
- Ability to force specific `compilerOptions`, no matter which `tsconfig` loads.
- Reuses existing services, if relevant, for transpilation of new files.

## License

MIT
