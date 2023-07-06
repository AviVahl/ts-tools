import { describe, it } from 'node:test';
import ts from 'typescript';
import { deadIfsTransformer } from '@ts-tools/robotrix';
import { codeEqual } from './code-equal';

describe('DeadIfsTransformer', () => {
  const transformers: ts.CustomTransformers = { before: [deadIfsTransformer] };
  const compilerOptions: ts.CompilerOptions = { target: ts.ScriptTarget.ES2017 };

  it('detects if (true) and cancels else branch', async () => {
    const code = `
        if (true) {
            shouldBeKept
        } else {
            shouldBeRemoved
        }
    `;

    const { outputText } = ts.transpileModule(code, { compilerOptions, transformers });

    await codeEqual(
      outputText,
      `
        if (true) {
            shouldBeKept
        }
      `,
    );
  });

  it('detects if (false) and cancels then branch', async () => {
    const code = `
      if (false) {
          shouldBeRemoved
      } else {
          shouldBeKept
      }
    `;

    const { outputText } = ts.transpileModule(code, { compilerOptions, transformers });

    await codeEqual(
      outputText,
      `
        if (false) { }
        else {
            shouldBeKept
        }
      `,
    );
  });

  it('checks `else if` as well', async () => {
    const code = `
      if (false) {
          shouldBeRemoved
      } else if (true) {
          shouldBeKept
      } else {
          shouldAlsoBeRemoved
      }
    `;

    const { outputText } = ts.transpileModule(code, { compilerOptions, transformers });

    await codeEqual(
      outputText,
      `
        if (false) { }
        else if (true) {
            shouldBeKept
        }
      `,
    );
  });

  describe('string equality checks', () => {
    it('handles === when strings are equal', async () => {
      const code = `
        if ('same' === 'same') {
            shouldBeKept
        } else {
            shouldBeRemoved
        }
      `;

      const { outputText } = ts.transpileModule(code, { compilerOptions, transformers });

      await codeEqual(
        outputText,
        `
          if (true) {
              shouldBeKept
          }
        `,
      );
    });

    it('handles === when actual strings are not equal', async () => {
      const code = `
        if ('text' === 'another') {
            shouldBeRemoved
        } else {
            shouldBeKept
        }
      `;

      const { outputText } = ts.transpileModule(code, { compilerOptions, transformers });

      await codeEqual(
        outputText,
        `
          if (false) { }
          else {
              shouldBeKept
          }
        `,
      );
    });

    it('handles !== when actual strings are equal', async () => {
      const code = `
        if ('same' !== 'same') {
            shouldBeRemoved
        } else {
            shouldBeKept
        }
      `;

      const { outputText } = ts.transpileModule(code, { compilerOptions, transformers });

      await codeEqual(
        outputText,
        `
          if (false) { }
          else {
              shouldBeKept
          }
        `,
      );
    });

    it('handles !== when actual strings are not equal', async () => {
      const code = `
        if ('text' !== 'another') {
            shouldBeKept
        } else {
            shouldBeRemoved
        }
      `;

      const { outputText } = ts.transpileModule(code, { compilerOptions, transformers });

      await codeEqual(
        outputText,
        `
          if (true) {
              shouldBeKept
          }
        `,
      );
    });
  });
});
