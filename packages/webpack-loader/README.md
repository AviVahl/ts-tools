# @ts-tools/webpack-loader
[![npm version](https://img.shields.io/npm/v/@ts-tools/webpack-loader.svg)](https://www.npmjs.com/package/@ts-tools/webpack-loader)

[TypeScript](https://www.typescriptlang.org/) loader for [webpack](https://webpack.js.org/).

Features:
- Full syntactic and semantic **type checking**.
- Loads configuration from the closest `tsconfig.json`, with support for **multiple configurations** inside a project.
- Automated source map configuration based on current `devtool` configuration.
- Built-in support for **baseUrl** and **paths** by using a custom transformer that remaps imports.

## Getting started

Install the library as a dev dependency in an existing TypeScript project:
```
yarn add @ts-tools/webpack-loader --dev
```

And adjust your webpack configuration to include:
```ts
exports.module = {
    rules: [
        {
            test: /\.tsx?$/,
            loader: '@ts-tools/webpack-loader'
        }
    ]
}

exports.resolve = {
    extensions: ['.ts', '.tsx', '.mjs', '.js', '.json']
}
```

## Options

```ts
interface ITypeScriptLoaderOptions {
    /**
     * Configuration file lookup (when no already loaded config is relevant).
     * Loader will search for the closest config file to the currently bundled
     * file, and load it.
     *
     * @default true
     */
    configLookup?: boolean

    /**
     * Perform type check, if possible (loaded config is relevant).
     *
     * @default true
     */
    typeCheck?: boolean

    /**
     * Expose diagnostics as webpack warnings.
     *
     * @default false exposes diagnostics as webpack errors
     */
    warnOnly?: boolean

    /**
     * Use colors when formatting diagnostics.
     *
     * @default true (if current platform supports it)
     */
    colors?: boolean

    /**
     * Keys to override in the `compilerOptions` section of the
     * `tsconfig.json` file.
     */
    compilerOptions?: object

    /**
     * Configuration file name to look for.
     *
     * @default 'tsconfig.json'
     */
    configFileName?: string
}
```

Options can be provided via the webpack configuration:
```ts
exports.module = {
    rules: [
        {
            test: /\.tsx?$/,
            loader: '@ts-tools/webpack-loader',
            options: {
                colors: false,
                warnOnly: true,
                compilerOptions: {
                    target: 'es5'
                }
            }
        }
    ]
}
```

## Known limitations

- The following `compilerOptions` are not supported:
  - `allowJs` and `checkJs` (might work, but untested).
  - `composite` projects.
- Declarations (and their maps) are forced *off* when bundling.
- `"module": "esnext"` is forced by default, as `webpack` understands it best (allows tree shaking and dynamic chunks). This may cause issues for projects using `import A = require('a')` syntax. Can be resolved by turning on `allowSyntheticDefaultImports` and `esModuleInterop` (in `tsconfig`) and using `import A from 'a'`. Webpack ensures CommonJS modules are always exposed as a default export, so this works properly.
- Source changes by preceding loaders are ignored, as this loader reads sources directly from webpack's input file system.

## Similar projects

- [ts-loader](https://github.com/TypeStrong/ts-loader)
- [awesome-typescript-loader](https://github.com/s-panferov/awesome-typescript-loader)

## License

MIT
