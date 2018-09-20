import { expect } from 'chai'
import { join, dirname } from 'path'
import { platform } from 'os'
import { runCommand } from './run-command'

const fixturesRoot = dirname(require.resolve('test-fixtures/package.json'))

describe('using node -r typescript-support/warn [file]', () => {
    describe('with tsconfig.json', () => {
        it('prints syntactic errors', () => {
            const filePath = join(fixturesRoot, 'errors', 'file-with-syntax-error.ts')

            const { output, exitCode } = runCommand(`node -r typescript-support/warn ${filePath}`)

            expect(exitCode).to.equal(0)
            expect(output).to.include(`')' expected`)
        })

        it('prints semantic errors', () => {
            const filePath = join(fixturesRoot, 'errors', 'file-with-type-error.ts')

            const { output, exitCode } = runCommand(`node -r typescript-support/warn ${filePath}`)

            expect(exitCode).to.equal(0)
            expect(output).to.include(`Type '123' is not assignable to type 'string'`)
        })

        it('maps stack traces using source maps', () => {
            const filePath = join(fixturesRoot, 'source-maps', 'with-tsconfig', 'throwing.ts')

            const { output, exitCode } = runCommand(`node -r typescript-support/warn ${filePath}`)

            expect(exitCode).to.not.equal(0)
            expect(output).to.include(`at runMe (${filePath}:11:15)`)
        })

        it('isolates two folders with different configs and prints errors', () => {
            const filePath = join(fixturesRoot, 'type-isolation', 'with-tsconfig-b', 'passes-type-check.ts')

            const { output, exitCode } = runCommand(`node -r typescript-support/warn ${filePath}`)

            expect(exitCode).to.equal(0)
            expect(output).to.include(`Cannot find name 'describe'`)
            expect(output).to.include('should-error.ts')
        })

    })

    describe('no tsconfig.json', () => {
        it('maps stack traces using source maps', () => {
            const filePath = join(fixturesRoot, 'source-maps', 'throwing-without-tsconfig.ts')

            const { output, exitCode } = runCommand(`node -r typescript-support/warn ${filePath}`)

            expect(exitCode).to.not.equal(0)
            expect(output).to.include(`at runMe (${filePath}:9:11)`)
        })

        it('allows using imports', () => {
            const filePath = join(fixturesRoot, 'no-tsconfig', 'imports.ts')

            const { output, exitCode } = runCommand(`node -r typescript-support/warn ${filePath}`)

            expect(exitCode).to.equal(0)
            expect(output).to.include(`Current platform is: ${platform()}`)
        })
    })

})
