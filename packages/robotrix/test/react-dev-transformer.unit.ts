import * as ts from 'typescript'
import { reactDevTransformer } from '../src'
import { validateCode } from './code-validation'

describe('ReactDevTransformer', () => {
    const transformers: ts.CustomTransformers = { before: [reactDevTransformer] }
    const compilerOptions: ts.CompilerOptions = { target: ts.ScriptTarget.ES2017 }
    const fileName = '/path/to/test-file.tsx'
    const jsxFileNameDef = `const __jsxFileName = "${fileName}";`

    it('adds __self and __source attributes to jsx elements', () => {
        const code = [
            `(<div>`,
            `  <span />`,
            `</div>);`
        ].join(ts.sys.newLine)

        const { outputText } = ts.transpileModule(code, { compilerOptions, transformers, fileName })

        validateCode(outputText, `
            ${jsxFileNameDef}
            (<div __self={this} __source={{ fileName: __jsxFileName, lineNumber: 1 }}>
              <span __self={this} __source={{ fileName: __jsxFileName, lineNumber: 2 }}/>
            </div>);
        `)
    })

    it('adds attributes to jsx elements inside jsx attributes', () => {
        const code = [
            `(<div`,
            `   icon={<p />}`,
            `/>);`
        ].join(ts.sys.newLine)

        const { outputText } = ts.transpileModule(code, { compilerOptions, transformers, fileName })

        validateCode(outputText, `
            ${jsxFileNameDef}
            (<div ` + `icon={<p __self={this} __source={{ fileName: __jsxFileName, lineNumber: 2 }}/>} ` +
            `__self={this} __source={{ fileName: __jsxFileName, lineNumber: 1 }}/>);
        `)
    })

    it('does not override existing __source attribute set by user', () => {
        const code = `(<div __source="custom value" />);`

        const { outputText } = ts.transpileModule(code, { compilerOptions, transformers, fileName })

        validateCode(outputText, `
            (<div __source="custom value" __self={this}/>);
        `)
    })

    it('does not override existing __self attribute set by user', () => {
        const code = `(<div __self="custom value" />);`

        const { outputText } = ts.transpileModule(code, { compilerOptions, transformers, fileName })

        validateCode(outputText, `
            ${jsxFileNameDef}
            (<div __self="custom value" __source={{ fileName: __jsxFileName, lineNumber: 1 }}/>);
        `)
    })
})
