import { expect } from 'chai'
import * as ts from 'typescript'
import { reactDevTransformer } from '../src'

describe('ReactDevTransformer', () => {
    const transformers: ts.CustomTransformers = { before: [reactDevTransformer] }
    const compilerOptions: ts.CompilerOptions = { target: ts.ScriptTarget.ES2017 }
    const fileName = '/path/to/test-file.tsx'
    const jsxFileNameDef = `const __jsxFileName = "${fileName}";`

    it('adds __self and __source attributes to jsx elements', () => {
        const code = `
            (<div>
                <span />
            </div>)
        `

        const { outputText } = ts.transpileModule(code, { compilerOptions, transformers, fileName })

        expect(outputText).to.matchCode(`
            ${jsxFileNameDef}
            (<div __self={this} __source={{ fileName: __jsxFileName, lineNumber: 2 }}>
                <span __self={this} __source={{ fileName: __jsxFileName, lineNumber: 3 }} />
            </div>)
        `)
    })

    it('adds attributes to jsx elements inside jsx attributes', () => {
        const code = `
            (<div
                icon={<p />}
            />)
        `

        const { outputText } = ts.transpileModule(code, { compilerOptions, transformers, fileName })

        expect(outputText).to.matchCode(`
            ${jsxFileNameDef}
            (<div
                icon={<p __self={this} __source={{ fileName: __jsxFileName, lineNumber: 3 }} />}
                __self={this}
                __source={{ fileName: __jsxFileName, lineNumber: 2 }} />)
        `)
    })

    it('does not override existing __source attribute set by user', () => {
        const code = `(<div __source="custom value" />) `

        const { outputText } = ts.transpileModule(code, { compilerOptions, transformers, fileName })

        expect(outputText).to.matchCode(`(<div __source="custom value" __self={this} />)`)
    })

    it('does not override existing __self attribute set by user', () => {
        const code = `(<div __self="custom value" />) `

        const { outputText } = ts.transpileModule(code, { compilerOptions, transformers, fileName })

        expect(outputText).to.matchCode(`
            ${jsxFileNameDef}
            (<div __self= "custom value" __source = {{ fileName: __jsxFileName, lineNumber: 1 }}/>)
        `)
    })
})
