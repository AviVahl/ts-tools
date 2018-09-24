declare interface NodeModule {
    // internal js compilation method, used by the require extension
    // to evaluate transpiled code
    _compile(code: string, filePath: string): void
}
