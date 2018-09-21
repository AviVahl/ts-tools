# @ts-tools/webpack-loader
[![npm version](https://img.shields.io/npm/v/@ts-tools/webpack-loader.svg)](https://www.npmjs.com/package/@ts-tools/webpack-loader)

[TypeScript](https://www.typescriptlang.org/) loader for [webpack](https://webpack.js.org/).

Features:
- Full syntactic and semantic **type checking**.
- Loads configuration from the closest `tsconfig.json`, with support for **multiple configurations** inside a project.

## Getting started

Install the library as a dev dependency in an existing TypeScript project:
```
yarn add @ts-tools/webpack-loader --dev
```

Add the following to your webpack config's [module.rules](https://webpack.js.org/configuration/module/#module-rules):
```ts
{
    test: /\.tsx?$/,
    loader: '@ts-tools/webpack-loader'
}
```

## Similar projects

- [ts-loader](https://github.com/TypeStrong/ts-loader)
- [awesome-typescript-loader](https://github.com/s-panferov/awesome-typescript-loader)

## License

MIT
