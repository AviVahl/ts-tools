export interface WebpackLoader {
  (this: LoaderContext, source: string | Buffer, sourceMap?: import('source-map').RawSourceMap):
    | string
    | Buffer
    | void
    | undefined;
}

export type LoaderCallback = (
  err: Error | undefined | null,
  content?: string | Buffer,
  sourceMap?: import('source-map').RawSourceMap
) => void;

export interface LoaderContext {
  rootContext: string;
  resourcePath: string;
  sourceMap: boolean;
  callback: LoaderCallback;
  emitWarning(message: string | Error): void;
  emitError(message: string | Error): void;
}

export interface LoaderUtils {
  getOptions(loaderContext: LoaderContext): Record<string, unknown>;
  getRemainingRequest(loaderContext: LoaderContext): string;
}
