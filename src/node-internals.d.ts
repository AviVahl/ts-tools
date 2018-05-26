declare interface NodeModule {
    // internal js compilation method, used by the require extension
    // to evalute transpiled code
    _compile(code: string, filePath: string): void
}
