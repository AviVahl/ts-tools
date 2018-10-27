# @ts-tools/robotrix
[![npm version](https://img.shields.io/npm/v/@ts-tools/robotrix.svg)](https://www.npmjs.com/package/@ts-tools/robotrix)

Useful [TypeScript](https://www.typescriptlang.org/) transpilation transformers.

## Getting started

Install the library:
```
yarn add @ts-tools/robotrix
```

## Transformers

### Node Env Transformer

Replaces `process.env.[PARAM]` expressions with string literals, using provided `env`.

```ts
import { createNodeEnvTransformer } from '@ts-tools/robotrix'
import { transpileModule } from 'typescript'

const nodeEnvTransformer = createNodeEnvTransformer(process.env)

const transpileOutput = transpileModule(code, { transformers: { before: [nodeEnvTransformer] } })
```

### React Dev Transformer

Adds meta-data which is used by `React` for development error messages.

It adds the following attributes to all JSX elements:
- `__self={this}`
- `__source={{ fileName: __jsxFileName, lineNumber: [jsx line number] }}`

if `__source` was added, the following declaration is prepended to source file: `const __jsxFileName = [absolute file path]`

```ts
import { reactDevTransformer } from '@ts-tools/robotrix'
import { transpileModule } from 'typescript'

const transpileOutput = transpileModule(code, { transformers: { before: [reactDevTransformer] } })
```

### Dead Ifs Transformer

Detects and removes dead `if` branches. Checks the expression of every `if` statement, and cancels out always falsy branches.

It detects `true`, `false`, and basic string equality comparison (`==`, `===`, `!=`, `!==`).

```ts
import { deadIfsTransformer } from '@ts-tools/robotrix'
import { transpileModule } from 'typescript'

const transpileOutput = transpileModule(code, { transformers: { before: [deadIfsTransformer] } })
```

### Remap Imports Transformer

Remaps targets of `esnext`'s static or dynamic imports/re-exports.

```ts
import { createRemapImportsTransformer } from '@ts-tools/robotrix'
import { transpileModule } from 'typescript'

const remapImportsTransformer = createRemapImportsTransformer({
    remapTarget(target: string, containingFile: string): string {
        // remaps 'lodash' to 'lodash-es'
        // all others targets are untouched
        return target === 'lodash' ? 'lodash-es' : target
    }
})

const transpileOutput = transpileModule(code, { transformers: { before: [remapImportsTransformer] } })
```

### CommonJS to ESM Transformer

Transforms CommonJS calls/exports to ESM syntax.
If a source file is identified as using `require`, `module`, or `exports`, it is wrapped with the following:

```ts
[generated imports]

let exports = {}, module = { exports }

[original code]

export default module.exports
```

Each `require(...)` call with a string request is converted to a generated import statement with a unique identifier.

```ts
import { createCjsToEsmTransformer } from '@ts-tools/robotrix'
import { transpileModule } from 'typescript'

const cjsToEsmTransformer = createCjsToEsmTransformer()
const transpileOutput = transpileModule(code, { transformers: { before: [cjsToEsmTransformer] } })
```

`createCjsToEsmTransformer()` also accepts an optional options object, where one can currently specify
`shouldTransform` to control whether to transform `require(...)` calls based on their target.

```ts
const blacklisted = new Set(['fs', 'another', 'etc'])

// doesn't convert any require(...) calls that target items in blacklisted
const cjsToEsmTransformer = createCjsToEsmTransformer({
    shouldTransform: request => !blacklisted.has(request)
})
```

### Resolved Modules Transformer

Remaps static/dynamic esm imports/re-exports to the actual files resolved by TypeScript.
It ignores relative targets (`./` or `../`) or ones resolved to definition (`.d.ts`) files.

Unlike other transformers in **robotrix**, this transformer requires TypeScript to resolve imports
as part of a typed-checked transpilation (where a `ts.Program` is involved). This means
it can be used when creating a custom `ts.LanguageService` and specifying `getCustomTransformers()`
during host creation.

```ts
import { resolvedModulesTransformer } from '@ts-tools/robotrix'
import { createLanguageService, LanguageServiceHost } from 'typescript'

const languageServiceHost: LanguageServiceHost = {
    getCustomTransformers() {
        return {
            before: [
                resolvedModulesTransformer
            ]
        }
    }
    // ...rest of the host implementation is up to you
}

const languageService = createLanguageService(languageServiceHost)
```



## License

MIT
