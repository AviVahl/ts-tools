import webpack from 'webpack'
import MemoryFS from 'memory-fs'
import { ITypeScriptLoaderOptions } from '../src'

export interface IBundleWithLoaderOptions {
    /**
     * Entry path to bundle
     */
    entry: string

    /**
     * Options to provide our loader with
     *
     * @default {colors:false}
     */
    loaderOptions?: ITypeScriptLoaderOptions

    /**
     * Directory path that serves as bundling base path
     */
    context?: string
}

export async function bundleWithLoader(
    { entry, loaderOptions, context }: IBundleWithLoaderOptions
): Promise<{ stats: webpack.Stats, statsText: string }> {

    const compiler = webpack({
        entry,
        context,
        mode: 'development',
        resolve: { extensions: ['.ts', '.tsx', '.js'] },
        module: {
            rules: [
                {
                    test: /\.tsx?$/,
                    loader: require.resolve('../src/index.ts'),
                    options: { colors: false, ...loaderOptions }
                }
            ]
        }
    })

    // so test output isn't saved on local hard drive
    compiler.outputFileSystem = new MemoryFS()

    const stats = await new Promise<webpack.Stats>((res, rej) => {
        compiler.run((e, s) => e ? rej(e) : res(s))
    })

    return { stats, statsText: stats.toString() }
}
