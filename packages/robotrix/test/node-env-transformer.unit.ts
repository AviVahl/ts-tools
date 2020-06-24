import { expect } from 'chai';
import { transpileModule } from 'typescript';
import { createNodeEnvTransformer } from '@ts-tools/robotrix';

describe('NodeEnvTransformer', () => {
  it('replaces process.env.[PARAM] using provided dictionary', () => {
    const transformer = createNodeEnvTransformer({ NODE_ENV: 'TEST', PARAM2: 'SOMEVALUE' });
    const code = `process.env.NODE_ENV || process.env.PARAM2`;

    const { outputText } = transpileModule(code, { transformers: { before: [transformer] } });

    expect(outputText).to.matchCode(`"TEST" || "SOMEVALUE"`);
  });

  it('replaces keys pointing to empty strings', () => {
    const transformer = createNodeEnvTransformer({ EMPTY: '' });
    const code = `process.env.EMPTY`;
    const { outputText } = transpileModule(code, { transformers: { before: [transformer] } });

    expect(outputText).to.matchCode(`""`);
  });

  it('does not replace unmapped keys', () => {
    const transformer = createNodeEnvTransformer({});
    const code = `process.env.NOT_MAPPED`;
    const { outputText } = transpileModule(code, { transformers: { before: [transformer] } });

    expect(outputText).to.matchCode(code);
  });

  it('does not replace keys pointing to undefined', () => {
    const transformer = createNodeEnvTransformer({ NOOP: undefined });
    const code = `process.env.NOOP`;
    const { outputText } = transpileModule(code, { transformers: { before: [transformer] } });

    expect(outputText).to.matchCode(code);
  });

  it('does not replace inherited Object attributes', () => {
    const transformer = createNodeEnvTransformer({});
    const code = `process.env.toString`;
    const { outputText } = transpileModule(code, { transformers: { before: [transformer] } });

    expect(outputText).to.matchCode(code);
  });
});
