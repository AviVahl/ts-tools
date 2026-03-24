import { describe, it } from 'node:test';
import ts from 'typescript';
import { reactDevTransformer } from '@ts-tools/robotrix';
import { codeEqual } from './code-equal';

describe('ReactDevTransformer', () => {
  const transformers: ts.CustomTransformers = { before: [reactDevTransformer] };
  const compilerOptions: ts.CompilerOptions = { target: ts.ScriptTarget.ES2017 };
  const fileName = '/path/to/test-file.tsx';
  const jsxFileNameDef = `const __jsxFileName = "${fileName}";`;

  it('adds __self and __source attributes to jsx elements', async () => {
    const code = `
            (<div>
                <span />
            </div>)
        `;

    const { outputText } = ts.transpileModule(code, { compilerOptions, transformers, fileName });

    await codeEqual(
      outputText,
      `
            ${jsxFileNameDef}
            (<div __self={this} __source={{ fileName: __jsxFileName, lineNumber: 2 }}>
                <span __self={this} __source={{ fileName: __jsxFileName, lineNumber: 3 }} />
            </div>)
        `,
    );
  });

  it('adds attributes to jsx elements inside jsx attributes', async () => {
    const code = `
            (<div
                icon={<p />}
            />)
        `;

    const { outputText } = ts.transpileModule(code, { compilerOptions, transformers, fileName });

    await codeEqual(
      outputText,
      `
            ${jsxFileNameDef}
            (<div
                icon={<p __self={this} __source={{ fileName: __jsxFileName, lineNumber: 3 }} />}
                __self={this}
                __source={{ fileName: __jsxFileName, lineNumber: 2 }} />)
        `,
    );
  });

  it('does not override existing __source attribute set by user', async () => {
    const code = `(<div __source="custom value" />) `;

    const { outputText } = ts.transpileModule(code, { compilerOptions, transformers, fileName });

    await codeEqual(outputText, `(<div __source="custom value" __self={this} />)`);
  });

  it('does not override existing __self attribute set by user', async () => {
    const code = `(<div __self="custom value" />) `;

    const { outputText } = ts.transpileModule(code, { compilerOptions, transformers, fileName });

    await codeEqual(
      outputText,
      `
            ${jsxFileNameDef}
            (<div __self="custom value" __source={{ fileName: __jsxFileName, lineNumber: 1 }} />)
        `,
    );
  });
});
