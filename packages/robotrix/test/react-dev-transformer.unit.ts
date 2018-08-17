import * as ts from 'typescript'
import { expect } from 'chai'
import { reactDevTransformer } from '../src'

describe('ReactDevTransformer', () => {
    const transformers: ts.CustomTransformers = { before: [reactDevTransformer] }
    const compilerOptions: ts.CompilerOptions = { target: ts.ScriptTarget.ES2017 }
    const fileName = '/path/to/test-file.tsx'

    it('adds __self and __source attributes to jsx elements', () => {
        const code = [
            `<div>`,
            `  <span />`,
            `</div>`
        ].join(ts.sys.newLine)

        const { outputText } = ts.transpileModule(code, { compilerOptions, transformers, fileName })

        expect(outputText).to.contain(`const __jsxFileName = "${fileName}";`)
        expect(outputText).to.contain('<div __self={this} __source={{ fileName: __jsxFileName, lineNumber: 1 }}>')
        expect(outputText).to.contain('<span __self={this} __source={{ fileName: __jsxFileName, lineNumber: 2 }}/>')
    })

    it('adds attributes to jsx elements inside jsx attributes', () => {
        const code = `<div icon={<p />} />`

        const { outputText } = ts.transpileModule(code, { compilerOptions, transformers, fileName })

        expect(outputText).to.contain(`const __jsxFileName = "${fileName}";`)
        expect(outputText).to.contain('<p __self={this} __source={{ fileName: __jsxFileName, lineNumber: 1 }}/>')
    })

    it('does not override existing __source attribute set by user', () => {
        const code = `<div __source="custom value" />`

        const { outputText } = ts.transpileModule(code, { compilerOptions, transformers, fileName })

        expect(outputText).to.not.contain(`const __jsxFileName = "${fileName}";`)
        expect(outputText).to.contain('__self={this}')
        expect(outputText).to.contain('__source="custom value"')
        expect(outputText).to.not.contain('__source={{ fileName: __jsxFileName, lineNumber: 1 }}')
    })

    it('does not override existing __self attribute set by user', () => {
        const code = `<div __self="custom value" />`

        const { outputText } = ts.transpileModule(code, { compilerOptions, transformers, fileName })

        expect(outputText).to.contain(`const __jsxFileName = "${fileName}";`)
        expect(outputText).to.not.contain('__self={this}')
        expect(outputText).to.contain('__self="custom value"')
        expect(outputText).to.contain('__source={{ fileName: __jsxFileName, lineNumber: 1 }}')
    })
})
