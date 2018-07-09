import { expect } from 'chai'
import { join, dirname } from 'path'
import { platform } from 'os'
import { runCommand } from './run-command'

const fixturesDirectory = dirname(require.resolve('test-fixtures/package.json'))

describe('using node -r typescript-support [file]', () => {
    describe('with tsconfig.json', () => {
        it('throws on syntactic errors', () => {
            const fileWithSyntaxError = join(fixturesDirectory, 'errors', 'file-with-syntax-error.ts')

            const { output, exitCode } = runCommand(`node -r typescript-support ${fileWithSyntaxError}`)

            expect(exitCode).to.not.equal(0)
            expect(output).to.include(`')' expected`)
        })

        it('throws on semantic errors', () => {
            const fileWithTypeError = join(fixturesDirectory, 'errors', 'file-with-type-error.ts')

            const { output, exitCode } = runCommand(`node -r typescript-support ${fileWithTypeError}`)

            expect(exitCode).to.not.equal(0)
            expect(output).to.include(`Type '123' is not assignable to type 'string'`)
        })

        it('maps stack traces using source maps', () => {
            const fileThatThrows = join(fixturesDirectory, 'source-maps', 'with-tsconfig', 'throwing.ts')

            const { output, exitCode } = runCommand(`node -r typescript-support ${fileThatThrows}`)

            expect(exitCode).to.not.equal(0)
            expect(output).to.include(`at runMe (${fileThatThrows}:11:15)`)
        })

        it('isolates two folders with different configs', () => {
            const workingFile = join(fixturesDirectory, 'type-isolation', 'with-tsconfig-b', 'passes-type-check.ts')

            const { output, exitCode } = runCommand(`node -r typescript-support ${workingFile}`)

            expect(exitCode).to.not.equal(0)
            expect(output).to.include(`Cannot find name 'describe'`)
            expect(output).to.include('should-error.ts')
        })

    })

    describe('no tsconfig.json', () => {
        it('maps stack traces using source maps', () => {
            const fileThatThrows = join(fixturesDirectory, 'source-maps', 'throwing-without-tsconfig.ts')

            const { output, exitCode } = runCommand(`node -r typescript-support ${fileThatThrows}`)

            expect(exitCode).to.not.equal(0)
            expect(output).to.include(`at runMe (${fileThatThrows}:9:11)`)
        })

        it('allows using imports', () => {
            const fileWithImports = join(fixturesDirectory, 'no-tsconfig', 'imports.ts')

            const { output, exitCode } = runCommand(`node -r typescript-support ${fileWithImports}`)

            expect(exitCode).to.equal(0)
            expect(output).to.include(`Current platform is: ${platform()}`)
        })
    })

})
