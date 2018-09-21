import { expect } from 'chai'
import { dirname, join } from 'path'
import { bundleWithLoader } from './bundle-with-loader'

const fixturesRoot = dirname(require.resolve('@ts-tools/fixtures/package.json'))

describe('webpack loader', function() {
    this.timeout(10000)

    it('allows bundling of .ts files', async () => {
        const entry = join(fixturesRoot, 'no-tsconfig', 'fails-without-transpilation.ts')
        const { stats, statsText } = await bundleWithLoader({ entry })

        expect(stats.hasErrors(), statsText).to.equal(false)
        expect(stats.hasWarnings(), statsText).to.equal(false)
    })

    it('allows bundling of .tsx files', async () => {
        const entry = join(fixturesRoot, 'no-tsconfig', 'react.tsx')
        const { stats, statsText } = await bundleWithLoader({ entry })

        expect(stats.hasErrors(), statsText).to.equal(false)
        expect(stats.hasWarnings(), statsText).to.equal(false)
    })

    it('exposes syntactic errors', async () => {
        const entry = join(fixturesRoot, 'errors', 'file-with-syntax-error.ts')
        const { stats, statsText } = await bundleWithLoader({ entry })

        expect(stats.hasErrors(), statsText).to.equal(true)
        expect(stats.hasWarnings(), statsText).to.equal(false)
        expect(statsText).to.contain(`file-with-syntax-error.ts(3,1): error TS1005: ')' expected`)
    })

    it('exposes semantic errors', async () => {
        const entry = join(fixturesRoot, 'errors', 'file-with-type-error.ts')
        const { stats, statsText } = await bundleWithLoader({ entry })

        expect(stats.hasErrors(), statsText).to.equal(true)
        expect(stats.hasWarnings(), statsText).to.equal(false)
        expect(statsText).to.contain(
            `file-with-type-error.ts(1,7): error TS2322: Type '123' is not assignable to type 'string'`
        )
    })

    it('supports tsconfig.json types isolation', async () => {
        const entry = join(fixturesRoot, 'type-isolation', 'with-tsconfig-b', 'passes-type-check.ts')
        const { stats, statsText } = await bundleWithLoader({ entry })

        expect(stats.hasErrors(), statsText).to.equal(true)
        expect(stats.hasWarnings(), statsText).to.equal(false)
        expect(statsText).to.contain(`should-error.ts(4,34): error TS2304: Cannot find name 'describe'`)
        expect(statsText).to.not.contain(`passes-type-check.ts(`)
    })

    describe('with warnOnly: true', () => {
        it('exposes syntactic errors as warnings', async () => {
            const entry = join(fixturesRoot, 'errors', 'file-with-syntax-error.ts')
            const { stats, statsText } = await bundleWithLoader({ entry, loaderOptions: { warnOnly: true } })

            expect(stats.hasErrors(), statsText).to.equal(false)
            expect(stats.hasWarnings(), statsText).to.equal(true)
            expect(statsText).to.contain(`file-with-syntax-error.ts(3,1): error TS1005: ')' expected`)
        })

        it('exposes semantic errors as warnings', async () => {
            const entry = join(fixturesRoot, 'errors', 'file-with-type-error.ts')
            const { stats, statsText } = await bundleWithLoader({ entry, loaderOptions: { warnOnly: true } })

            expect(stats.hasErrors(), statsText).to.equal(false)
            expect(stats.hasWarnings(), statsText).to.equal(true)
            expect(statsText).to.contain(
                `file-with-type-error.ts(1,7): error TS2322: Type '123' is not assignable to type 'string'`
            )
        })
    })
})
