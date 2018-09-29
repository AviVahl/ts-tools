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
                warnOnly: true
            }
        }
    ]
}
```

## Known limitations

- webpack's `rootContext` isn't used as cwd (current working directory), so paths in diagnostics are relative to the real cwd. 
- The following `compilerOptions` are not supported:
  - `allowJs` and `checkJs`.
  - `baseUrl` and `paths`, when used for custom resolution of runtime abstractions (types work).
  - `composite` projects.
- Using loaders before this loader is not supported, as it reads sources directly from the file system.
- Using the loader to transpile `.js` files in `node_modules` will cause excessive lookups of `tsconfig`, although transpilation works.
- `"module": "esnext"` is always forced, as `webpack` understands it best (allows tree shaking and dynamic chunks). This can cause issues for projects using `import A = require('a')`. Turn on `allowSyntheticDefaultImports` and `esModuleInterop` and use import default. Webpack ensures CommonJS modules are always exposed as a default export as well.
- Sourcemaps are always forced *on* during tranpilation, even if webpack has `devtool: false`. 
- Declarations (and their maps) are forced *off* when bundling.
- `.d.ts` files in `src` or `node_modules` are not being watched. Even ones that actually affect type checking result.

## Similar projects

- [ts-loader](https://github.com/TypeStrong/ts-loader)
- [awesome-typescript-loader](https://github.com/s-panferov/awesome-typescript-loader)

## License

MIT
