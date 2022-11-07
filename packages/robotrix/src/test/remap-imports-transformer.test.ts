import { describe, it } from 'node:test';
import ts from 'typescript';
import { createRemapImportsTransformer } from '@ts-tools/robotrix';
import { codeEqual } from './code-equal';

describe('RemapImportsTransformer', () => {
  const compilerOptions: ts.CompilerOptions = { target: ts.ScriptTarget.ES2017 };

  const transformer = createRemapImportsTransformer({
    remapTarget: (target) => (target === 'A' ? 'B' : target),
  });

  it('remaps static imports', () => {
    const code = `
      import {namedSymbol} from "A"
      import * as namespaceSymbol from "A"
      import "A"
      console.log(namedSymbol, namespaceSymbol)
    `;

    const { outputText } = ts.transpileModule(code, {
      transformers: { before: [transformer] },
      compilerOptions,
    });

    codeEqual(
      outputText,
      `
        import {namedSymbol} from "B"
        import * as namespaceSymbol from "B"
        import "B"
        console.log(namedSymbol, namespaceSymbol)
      `
    );
  });

  it('remaps re-exports', () => {
    const code = `
      export {someSymbol} from "A"
      export * from "A"
    `;

    const { outputText } = ts.transpileModule(code, {
      transformers: { before: [transformer] },
      compilerOptions,
    });

    codeEqual(
      outputText,
      `
            export {someSymbol} from "B"
            export * from "B"
        `
    );
  });

  it('remaps dynamic imports', () => {
    const code = `
            import("A").then(console.log)
        `;

    const { outputText } = ts.transpileModule(code, {
      transformers: { before: [transformer] },
      compilerOptions,
    });

    codeEqual(
      outputText,
      `
            import("B").then(console.log)
        `
    );
  });

  it('remaps common js require calls', () => {
    const code = `
            require("A")
        `;

    const { outputText } = ts.transpileModule(code, {
      transformers: { before: [transformer] },
      compilerOptions,
    });

    codeEqual(
      outputText,
      `
            require("B")
        `
    );
  });
});
