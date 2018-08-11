# robotrix
[![npm version](https://badge.fury.io/js/robotrix.svg)](https://www.npmjs.com/package/robotrix)

Several useful [TypeScript](https://www.typescriptlang.org/) transpilation transformers.

## Getting started

Install the library:
```
yarn add robotrix
```

## Transformers

### NodeEnvTransformer

Replaces `process.env.[PARAM]` expressions with string literals, using provided `env`.

```ts
import { createNodeEnvTransformer } from 'robotrix'
import { transpileModule } from 'typescript'

const nodeEnvTransformer = createNodeEnvTransformer(process.env)

const transpileOutput = transpileModule(code, { transformers: { before: [nodeEnvTransformer] } })
```

## License

MIT
