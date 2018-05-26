import { NodeTypeScriptService } from '../../src'
import { expect } from 'chai'
import { join } from 'path'

describe('Node TypeScript Service', () => {
    const withTsConfigProject = join(__dirname, '..', 'test-cases', 'with-tsconfig')
    describe('with tsconfig.json', () => {
        it('throws on syntactic errors', () => {
            const fileWithSyntaxError = join(withTsConfigProject, 'src', 'file-with-syntax-error.ts')
            const service = new NodeTypeScriptService()

            expect(() => service.requireExtension(module, fileWithSyntaxError))
                .to.throw(`'(' expected`)
        })

        it('throws semantic errors', () => {
            const fileWithSyntaxError = join(withTsConfigProject, 'src', 'file-with-type-error.ts')
            const service = new NodeTypeScriptService()

            expect(() => service.requireExtension(module, fileWithSyntaxError))
                .to.throw(`Type '123' is not assignable to type 'string'`)
        })

        it('maps stack traces using source maps', () => {
            const fileThatThrows = join(withTsConfigProject, 'src', 'throwing.ts')
            const service = new NodeTypeScriptService()
            service.installSourceMapSupport()

            try {
                service.requireExtension(module, fileThatThrows)
                throw new Error('expected requireExtension to throw.')
            } catch (error) {
                expect(error.stack).to.contain('throwing.ts:11:15')
            }
        })

        it('isolates two folders with different configs', () => {
            const fileWithDescribe = join(withTsConfigProject, 'test', 'type-isolation.ts')
            const fileWithoutDescribe = join(withTsConfigProject, 'src', 'type-isolation.ts')
            const service = new NodeTypeScriptService()

            service.requireExtension(module, fileWithDescribe)
            expect(() => service.requireExtension(module, fileWithDescribe)).to.not.throw()
            expect(() => service.requireExtension(module, fileWithoutDescribe))
                .to.throw(`Cannot find name 'describe'`)
        })

    })

    const noTsConfigProject = join(__dirname, '..', 'test-cases', 'no-tsconfig')
    describe('no tsconfig.json', () => {
        it('throws on syntactic errors', () => {
            const fileWithSyntaxError = join(noTsConfigProject, 'file-with-syntax-error.ts')
            const service = new NodeTypeScriptService()

            expect(() => service.requireExtension(module, fileWithSyntaxError))
                .to.throw('Missing initializer in const declaration')
        })

        it('maps stack traces using source maps', () => {
            const fileThatThrows = join(noTsConfigProject, 'throwing.ts')
            const service = new NodeTypeScriptService()
            service.installSourceMapSupport()

            try {
                service.requireExtension(module, fileThatThrows)
                throw new Error('expected requireExtension to throw.')
            } catch (error) {
                expect(error.stack).to.contain('throwing.ts:9:11')
            }

        })
    })
})
