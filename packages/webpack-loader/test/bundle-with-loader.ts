import webpack from 'webpack';
import { join } from 'path';
import { ITypeScriptLoaderOptions, tsService } from '../src';

export interface IBundleWithLoaderOptions {
    /**
     * Entry path to bundle
     */
    entry: string;

    /**
     * Options to provide our loader with
     *
     * @default {colors:false}
     */
    loaderOptions?: ITypeScriptLoaderOptions;

    /**
     * Directory path that serves as bundling base path
     */
    context?: string;
}

// direct path to loader's source
const loaderPath = require.resolve('../src/index.ts');

export async function bundleWithLoader(
    { entry, loaderOptions, context }: IBundleWithLoaderOptions
): Promise<{ stats: webpack.Stats, statsText: string }> {
    // clear loader's cache before bundling.
    // cwd is cached on baseHost, and several tests use same fixture with different cwd
    tsService.clear();

    const compiler = webpack({
        entry,
        context,
        mode: 'development',
        resolve: { extensions: ['.ts', '.tsx', '.js'] },
        module: {
            rules: [
                {
                    test: /\.tsx?$/,
                    loader: loaderPath,
                    options: { colors: false, ...loaderOptions }
                }
            ]
        }
    });

    // so test output isn't saved on local hard drive
    compiler.outputFileSystem = noopOutputFileSystem;

    const stats = await new Promise<webpack.Stats>((res, rej) => {
        compiler.run((e, s) => e ? rej(e) : res(s));
    });

    return { stats, statsText: stats.toString() };
}

const noopOutputFileSystem: webpack.OutputFileSystem = {
    join,
    mkdir(_path, callback) { callback(null); },
    mkdirp(_path, callback) { callback(null); },
    rmdir(_path, callback) { callback(null); },
    unlink(_path, callback) { callback(null); },
    writeFile(_path, _data, callback) { callback(null); }
};
