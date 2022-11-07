import { describe, it } from 'node:test';
import ts from 'typescript';
import { createNodeEnvTransformer } from '@ts-tools/robotrix';
import { codeEqual } from './code-equal';

describe('NodeEnvTransformer', () => {
  it('replaces process.env.[PARAM] using provided dictionary', () => {
    const transformer = createNodeEnvTransformer({ NODE_ENV: 'TEST', PARAM2: 'SOMEVALUE' });
    const code = `process.env.NODE_ENV || process.env.PARAM2`;

    const { outputText } = ts.transpileModule(code, { transformers: { before: [transformer] } });

    codeEqual(outputText, `"TEST" || "SOMEVALUE"`);
  });

  it('replaces keys pointing to empty strings', () => {
    const transformer = createNodeEnvTransformer({ EMPTY: '' });
    const code = `process.env.EMPTY`;
    const { outputText } = ts.transpileModule(code, { transformers: { before: [transformer] } });

    codeEqual(outputText, `""`);
  });

  it('does not replace unmapped keys', () => {
    const transformer = createNodeEnvTransformer({});
    const code = `process.env.NOT_MAPPED`;
    const { outputText } = ts.transpileModule(code, { transformers: { before: [transformer] } });

    codeEqual(outputText, code);
  });

  it('does not replace keys pointing to undefined', () => {
    const transformer = createNodeEnvTransformer({ NOOP: undefined });
    const code = `process.env.NOOP`;
    const { outputText } = ts.transpileModule(code, { transformers: { before: [transformer] } });

    codeEqual(outputText, code);
  });

  it('does not replace inherited Object attributes', () => {
    const transformer = createNodeEnvTransformer({});
    const code = `process.env.toString`;
    const { outputText } = ts.transpileModule(code, { transformers: { before: [transformer] } });

    codeEqual(outputText, code);
  });
});
