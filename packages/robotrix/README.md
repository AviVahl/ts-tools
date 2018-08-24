# robotrix
[![npm version](https://badge.fury.io/js/robotrix.svg)](https://www.npmjs.com/package/robotrix)

Several useful [TypeScript](https://www.typescriptlang.org/) transpilation transformers.

## Getting started

Install the library:
```
yarn add robotrix
```

## Transformers

### Node Env Transformer

Replaces `process.env.[PARAM]` expressions with string literals, using provided `env`.

```ts
import { createNodeEnvTransformer } from 'robotrix'
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
import { reactDevTransformer } from 'robotrix'
import { transpileModule } from 'typescript'

const transpileOutput = transpileModule(code, { transformers: { before: [reactDevTransformer] } })
```

### Dead Ifs Transformer

Detects and removes dead `if` branches. Checks the expression of every `if` statement, and cancels out always falsy branches.

It detects `true`, `false`, and basic string equality comparison (`==`, `===`, `!=`, `!==`).

```ts
import { deadIfsTransformer } from 'robotrix'
import { transpileModule } from 'typescript'

const transpileOutput = transpileModule(code, { transformers: { before: [deadIfsTransformer] } })
```

## License

MIT
