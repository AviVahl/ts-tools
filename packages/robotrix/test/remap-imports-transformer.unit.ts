import { expect } from 'chai'
import ts from 'typescript'
import { createRemapImportsTransformer } from '../src'

describe('RemapImportsTransformer', () => {
    const compilerOptions: ts.CompilerOptions = { target: ts.ScriptTarget.ES2017 }

    const transformer = createRemapImportsTransformer({
        remapTarget: target => target === 'A' ? 'B' : target
     })

    it('remaps static imports', () => {
        const code = `
            import {namedSymbol} from "A"
            import * as namespaceSymbol from "A"
            import "A"
            console.log(namedSymbol, namespaceSymbol)
            `

        const { outputText } = ts.transpileModule(code, {
            transformers: { before: [transformer] },
            compilerOptions
        })

        expect(outputText).to.matchCode(`
            import {namedSymbol} from "B"
            import * as namespaceSymbol from "B"
            import "B"
            console.log(namedSymbol, namespaceSymbol)
        `)
    })

    it('remaps re-exports', () => {
        const code = `
            export {someSymbol} from "A"
            export * from "A"
        `

        const { outputText } = ts.transpileModule(code, {
            transformers: { before: [transformer] },
            compilerOptions
        })

        expect(outputText).to.matchCode(`
            export {someSymbol} from "B"
            export * from "B"
        `)
    })

    it('remaps dynamic imports', () => {
        const code = `
            import("A").then(console.log)
        `

        const { outputText } = ts.transpileModule(code, {
            transformers: { before: [transformer] },
            compilerOptions
        })

        expect(outputText).to.matchCode(`
            import("B").then(console.log)
        `)
    })
})
