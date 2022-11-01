import { describe, it } from 'node:test';
import ts from 'typescript';
import chai, { expect } from 'chai';
import { createCjsToEsmTransformer } from '@ts-tools/robotrix';
import { codeMatchers } from './code-matchers';

chai.use(codeMatchers);

const cjsDef = `let exports = {}, module = { exports }`;
const cjsEsmExport = `export default module.exports`;

describe('CjsToEsmTransformer', () => {
  const compilerOptions: ts.CompilerOptions = { target: ts.ScriptTarget.ES2017 };

  describe('wrapping of exports', () => {
    it('wraps code using module.exports', () => {
      const transformer = createCjsToEsmTransformer();
      const code = `module.exports = 123`;

      const { outputText } = ts.transpileModule(code, {
        transformers: { before: [transformer] },
        compilerOptions,
      });

      expect(outputText).to.matchCode(`
                ${cjsDef}
                ${code}
                ${cjsEsmExport}
            `);
    });

    it(`wraps code using module['exports']`, () => {
      const transformer = createCjsToEsmTransformer();
      const code = `module['exports'] = 123`;

      const { outputText } = ts.transpileModule(code, {
        transformers: { before: [transformer] },
        compilerOptions,
      });

      expect(outputText).to.matchCode(`
                ${cjsDef}
                ${code}
                ${cjsEsmExport}
            `);
    });

    it('wraps code using exports.<something>', () => {
      const transformer = createCjsToEsmTransformer();
      const code = `exports.do = 123`;

      const { outputText } = ts.transpileModule(code, {
        transformers: { before: [transformer] },
        compilerOptions,
      });

      expect(outputText).to.matchCode(`
                ${cjsDef}
                ${code}
                ${cjsEsmExport}
            `);
    });

    it('wraps code using typeof exports', () => {
      const transformer = createCjsToEsmTransformer();
      const code = `typeof exports`;

      const { outputText } = ts.transpileModule(code, {
        transformers: { before: [transformer] },
        compilerOptions,
      });

      expect(outputText).to.matchCode(`
                ${cjsDef}
                ${code}
                ${cjsEsmExport}
            `);
    });
  });

  describe('handling require(...) calls', () => {
    it('transforms require calls to default imports and wraps code as cjs', () => {
      const transformer = createCjsToEsmTransformer();
      const code = `module.exports = require('some-package')`;

      const { outputText } = ts.transpileModule(code, {
        transformers: { before: [transformer] },
        compilerOptions,
      });

      expect(outputText).to.matchCode(`
                import _imported_1 from 'some-package'
                ${cjsDef}
                module.exports = _imported_1
                ${cjsEsmExport}
            `);
    });

    it('wraps code as cjs even if just require() is used (without exports)', () => {
      const transformer = createCjsToEsmTransformer();
      const code = `require('some-package')`;

      const { outputText } = ts.transpileModule(code, {
        transformers: { before: [transformer] },
        compilerOptions,
      });

      expect(outputText).to.matchCode(`
                import _imported_1 from 'some-package'
                ${cjsDef}
                _imported_1
                ${cjsEsmExport}
            `);
    });

    it('retains package names when variable declaration is detected', () => {
      const transformer = createCjsToEsmTransformer();
      const code = `const myPackage = require('some-package'), b = require('b')`;

      const { outputText } = ts.transpileModule(code, {
        transformers: { before: [transformer] },
        compilerOptions,
      });

      expect(outputText).to.matchCode(`
                import myPackage_1 from 'some-package'
                import b_1 from 'b'
                ${cjsDef}
                const myPackage = myPackage_1, b = b_1
                ${cjsEsmExport}
            `);
    });

    it('does not transform if a require function parameter is detected', () => {
      const transformer = createCjsToEsmTransformer();
      const code = `
                function test(require) {
                    require('anything')
                }
                const a = {
                    run(require) {
                        require('lib')
                    }
                }
            `;

      const { outputText } = ts.transpileModule(code, {
        transformers: { before: [transformer] },
        compilerOptions,
      });

      expect(outputText).to.matchCode(code);
    });

    it('does not transform require(...) calls inside a try block', () => {
      const transformer = createCjsToEsmTransformer();
      const code = `
                try {
                    require('anything')
                } catch(e) {}
            `;

      const { outputText } = ts.transpileModule(code, {
        transformers: { before: [transformer] },
        compilerOptions,
      });

      expect(outputText).to.matchCode(code);
    });

    it('does not transform require(...) if esm is detected', () => {
      const transformer = createCjsToEsmTransformer();
      const code = `
                import { someSymbol } from 'somewhere'
                require('anything')
                console.log(someSymbol)
            `;

      const { outputText } = ts.transpileModule(code, {
        transformers: { before: [transformer] },
        compilerOptions,
      });

      expect(outputText).to.matchCode(code);
    });

    it('does not transform if shouldTransform returns false', () => {
      const transformer = createCjsToEsmTransformer({
        shouldTransform: (lib) => lib === 'a',
      });

      const code = `
                const a = require('a')
                const b = require('b')
            `;

      const { outputText } = ts.transpileModule(code, {
        transformers: { before: [transformer] },
        compilerOptions,
      });

      expect(outputText).to.matchCode(`
                import a_1 from 'a'
                ${cjsDef}
                const a = a_1
                const b = require('b')
                ${cjsEsmExport}
            `);
    });
  });
});
