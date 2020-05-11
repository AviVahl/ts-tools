# @ts-tools/webpack-loader

[![npm version](https://img.shields.io/npm/v/@ts-tools/webpack-loader.svg)](https://www.npmjs.com/package/@ts-tools/webpack-loader)

[TypeScript](https://www.typescriptlang.org/) loader for [webpack](https://webpack.js.org/).

Features:

- Fast! Uses `ts.transpileModule`. Leaves type checking to other flows.
- Uses persistent disk caching (`node_modules/.cache/ts-<moodule>-<target>`). Second run will not re-transpile a file if not changed.
- Loads configuration from the closest `tsconfig.json`.
- Automated source map configuration based on current `devtool` configuration.

## Getting started

Install the library as a dev dependency in an existing TypeScript project:

```
yarn add @ts-tools/webpack-loader --dev
```

And adjust your webpack configuration to include:

```ts
module.exports = {
  // ...
  module: {
    rules: [
      {
        test: /\.tsx?$/,
        loader: '@ts-tools/webpack-loader',
      },
    ],
  },
  resolve: {
    extensions: ['.ts', '.tsx', '.mjs', '.js', '.json'],
  },
  // ...
};
```

## Options

```ts
interface ITypeScriptLoaderOptions {
  /**
   * Keys to override in the `compilerOptions` section of the
   * `tsconfig.json` file.
   */
  compilerOptions?: object;

  /**
   * Turn persistent caching on/off.
   *
   *  @default true
   */
  cache?: boolean;

  /**
   * Absolute path of an existing directory to use for persistent cache.
   *
   * @default uses `find-cache-dir` to search for caching path.
   */
  cacheDirectoryPath?: string;

  /**
   * Path to `tsconfig.json` file.
   * Specifying it will skip config lookup
   */
  configFilePath?: string;

  /**
   * Name of config file to search for when looking up config.
   *
   * @default 'tsconfig.json'
   */
  configFileName?: string;

  /**
   * Should loader search for config.
   * Loader will search for the closest tsconfig file to the root context, and load it.
   *
   * @default true
   */
  configLookup?: boolean;
}
```

Options can be provided via the webpack configuration:

```ts
module.exports = {
  // ...
  module: {
    rules: [
      {
        test: /\.tsx?$/,
        loader: '@ts-tools/webpack-loader',
        options: {
          compilerOptions: {
            target: 'es5',
          },
        },
      },
    ],
  },
  // ...
};
```

## Similar projects

- [ts-loader](https://github.com/TypeStrong/ts-loader)
- [awesome-typescript-loader](https://github.com/s-panferov/awesome-typescript-loader)

## License

MIT
