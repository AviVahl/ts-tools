import { dirname } from 'node:path';
import webpack from 'webpack';
import { createFsFromVolume, Volume } from 'memfs';
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
  compiler.outputFileSystem = createFsFromVolume(new Volume()) as webpack.Compiler['outputFileSystem'];

  const stats = await new Promise<webpack.Stats>((res, rej) => {
    compiler.run((e, s) => (e ? rej(e) : res(s!)));
  });

  return { stats, statsText: stats.toString() };
}
