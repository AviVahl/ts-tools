import { spawnSync } from 'child_process'
import { expect } from 'chai'
import { join, dirname } from 'path'
import { platform } from 'os'

const fixturesDirectory = dirname(require.resolve('test-fixtures/package.json'))

describe('using node -r typescript-support [file]', () => {
    const runWithRequireHook = (tsFilePath: string) =>
        spawnSync('node', ['-r', 'typescript-support', tsFilePath]).output.join('\n')

    describe('with tsconfig.json', () => {
        it('throws on syntactic errors', () => {
            const fileWithSyntaxError = join(fixturesDirectory, 'errors', 'file-with-syntax-error.ts')
            const output = runWithRequireHook(fileWithSyntaxError)

            expect(output).to.include(`Transpilation Errors in ${fileWithSyntaxError}`)
            expect(output).to.include(`')' expected`)
        })

        it('throws semantic errors', () => {
            const fileWithTypeError = join(fixturesDirectory, 'errors', 'file-with-type-error.ts')
            const output = runWithRequireHook(fileWithTypeError)

            expect(output).to.include(`Transpilation Errors in ${fileWithTypeError}`)
            expect(output).to.include(`Type '123' is not assignable to type 'string'`)
        })

        it('maps stack traces using source maps', () => {
            const fileThatThrows = join(fixturesDirectory, 'source-maps', 'with-tsconfig', 'throwing.ts')
            const output = runWithRequireHook(fileThatThrows)

            expect(output).to.include(`at runMe (${fileThatThrows}:11:15)`)
        })

        it('isolates two folders with different configs', () => {
            const errorFile = join(fixturesDirectory, 'type-isolation', 'with-tsconfig-a', 'should-error.ts')
            const workingFile = join(fixturesDirectory, 'type-isolation', 'with-tsconfig-b', 'passes-type-check.ts')

            const output = runWithRequireHook(workingFile)

            expect(output).to.not.include(`Transpilation Errors in ${workingFile}`)
            expect(output).to.include(`Transpilation Errors in ${errorFile}`)
            expect(output).to.include(`Cannot find name 'describe'`)
        })

    })

    describe('no tsconfig.json', () => {
        it('maps stack traces using source maps', () => {
            const fileThatThrows = join(fixturesDirectory, 'source-maps', 'throwing-without-tsconfig.ts')
            const output = runWithRequireHook(fileThatThrows)

            expect(output).to.include(`at runMe (${fileThatThrows}:9:11)`)
        })

        it('allows using imports', () => {
            const fileWithImports = join(fixturesDirectory, 'no-tsconfig', 'imports.ts')
            const output = runWithRequireHook(fileWithImports)

            expect(output).to.include(`Current platform is: ${platform()}`)
        })
    })

})
