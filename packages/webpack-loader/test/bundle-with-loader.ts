import { join, dirname } from 'path';
import webpack from 'webpack';
import type { ITypeScriptLoaderOptions } from '@ts-tools/webpack-loader';

export interface IBundleWithLoaderOptions {
  entry: string;
  options?: ITypeScriptLoaderOptions;
  context?: string;
}

export async function bundleWithLoader({
  entry,
  options,
  context = dirname(entry),
}: IBundleWithLoaderOptions): Promise<{ stats: webpack.Stats; statsText: string }> {
  const compiler = webpack({
    entry,
    context,
    mode: 'development',
    resolve: { extensions: ['.ts', '.tsx', '.js'] },
    module: {
      rules: [
        {
          test: /\.tsx?$/,
          loader: '@ts-tools/webpack-loader',
          options,
        },
      ],
    },
  });

  // so test output isn't saved on local hard drive
  compiler.outputFileSystem = (noopOutputFileSystem as unknown) as import('webpack').Compiler['outputFileSystem'];

  const stats = await new Promise<webpack.Stats>((res, rej) => {
    compiler.run((e, s) => (e ? rej(e) : res(s)));
  });

  return { stats, statsText: stats.toString() };
}

const noopOutputFileSystem = {
  join,
  mkdir(_path: string, callback: () => void) {
    callback();
  },
  mkdirp(_path: string, callback: () => void) {
    callback();
  },
  rmdir(_path: string, callback: () => void) {
    callback();
  },
  stat(_path: string, callback: (e?: Error) => void) {
    callback(new Error(`ENOENT`));
  },
  unlink(_path: string, callback: () => void) {
    callback();
  },
  writeFile(_path: string, _data: unknown, callback: () => void) {
    callback();
  },
};
