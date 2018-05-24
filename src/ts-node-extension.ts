import * as ts from 'typescript'
import chalk from 'chalk'
import { dirname } from 'path'
import { sharedDocumentRegistry, runningServices, directoryToTsConfig, sourceMaps } from './global-state'

const { red } = chalk

// Node-compatible default compiler options
// used when no tsconfig is found, or if found config does not include the file being compiled
export const defaultCompilerOptions: ts.CompilerOptions = {
    target: ts.ScriptTarget.ES2017,
    module: ts.ModuleKind.CommonJS,
    jsx: ts.JsxEmit.React, // opinionated
    moduleResolution: ts.ModuleResolutionKind.NodeJs,
    sourceMap: true
}

// used for formatting diagnostics
const defaultCompilerHost = ts.createCompilerHost(defaultCompilerOptions)

export function TypeScriptNodeExtension(nodeModule: NodeModule, filePath: string): void {
    const languageService = getLanguageService(filePath)
    if (languageService) {
        transpileUsingLanguageService(nodeModule, filePath, languageService)
    } else {
        transpileUsingDefaultOptions(nodeModule, filePath)
    }
}

function transpileUsingLanguageService(
    nodeModule: NodeModule,
    filePath: string,
    languageService: ts.LanguageService
): void {
    const { outputFiles, emitSkipped } = languageService.getEmitOutput(filePath)

    const syntacticDiagnostics = languageService.getSyntacticDiagnostics(filePath)
    if (syntacticDiagnostics.length) {
        const formattedDiagnostics = ts.formatDiagnostics(syntacticDiagnostics, defaultCompilerHost)
        throw new Error(`${red('Syntactic errors')} in ${red(filePath)}\n${formattedDiagnostics}`)
    }
    const semanticDiagnostics = languageService.getSemanticDiagnostics(filePath)
    if (semanticDiagnostics.length) {
        const formattedDiagnostics = ts.formatDiagnostics(semanticDiagnostics, defaultCompilerHost)
        throw new Error(`${red('Semantic errors')} in ${red(filePath)}\n${formattedDiagnostics}`)
        // throw new Error(`Semantic errors in ${filePath}\n${formattedDiagnostics}`)
    }

    if (emitSkipped) {
        throw new Error(`Emit of ${filePath} was skipped.`)
    }

    const jsOutputFile = outputFiles.filter(outputFile => outputFile.name.endsWith('.js')).shift()
    const sourceMapOutputFile = outputFiles.filter(outputFile => outputFile.name.endsWith('.js.map')).shift()

    if (!jsOutputFile) {
        throw new Error(`No js output for ${filePath}`)
    }

    if (sourceMapOutputFile) {
        sourceMaps.set(filePath, sourceMapOutputFile.text)
    }

    nodeModule._compile(jsOutputFile.text, filePath)
}

function transpileUsingDefaultOptions(
    nodeModule: NodeModule,
    filePath: string
): void {
    const tsCode = ts.sys.readFile(filePath)
    if (!tsCode) {
        throw new Error(`Unable to read ${filePath}`)
    }
    const { outputText, diagnostics, sourceMapText } = ts.transpileModule(tsCode, {
        fileName: filePath,
        compilerOptions: defaultCompilerOptions
    })

    if (diagnostics && diagnostics.length) {
        const formattedDiagnostics = ts.formatDiagnostics(diagnostics, defaultCompilerHost)
        throw new Error(`${red('Errors')} while transpiling ${red(filePath)}\n${formattedDiagnostics}`)
    }

    if (sourceMapText) {
        sourceMaps.set(filePath, sourceMapText)
    }
    nodeModule._compile(outputText, filePath)
}

function getLanguageService(
    filePath: string
): ts.LanguageService | null {
    for (const existingLanguageService of runningServices.values()) {
        if (existingLanguageService.getProgram().getRootFileNames().includes(filePath)) {
            return existingLanguageService
        }
    }

    const containingDirectory = dirname(filePath)
    const tsConfigPath = getTsConfigPath(containingDirectory)

    // couldn't find a tsconfig, or there is one that didn't include our file
    if (!tsConfigPath || runningServices.has(tsConfigPath)) {
        return null
    }

    const jsonSourceFile = ts.readJsonConfigFile(tsConfigPath, ts.sys.readFile)
    const { fileNames, options, errors } =
        ts.parseJsonSourceFileConfigFileContent(jsonSourceFile, ts.sys, containingDirectory)

    if (errors.length) {
        const compilerHost = ts.createCompilerHost(options)
        throw new Error(`Errors while parsing ${tsConfigPath}\n${ts.formatDiagnostics(errors, compilerHost)}`)
    }

    // Force CommonJS, as we are in Node
    options.module = ts.ModuleKind.CommonJS

    // Force no declarations as they are not used. We lose declaration-specific validations, but gain better speed.
    options.declaration = false

    // Turn on inline source maps and turn off regular sourceMap
    options.sourceMap = true
    options.inlineSourceMap = options.inlineSources = false

    const languageServiceHost = createLanguageServiceHost(fileNames, options)
    const languageService = ts.createLanguageService(languageServiceHost, sharedDocumentRegistry)
    runningServices.set(tsConfigPath, languageService)

    if (fileNames.includes(filePath)) {
        return languageService
    } else {
        return null
    }
}

function getTsConfigPath(
    baseDirectory: string
): string | undefined {
    if (directoryToTsConfig.has(baseDirectory)) {
        return directoryToTsConfig.get(baseDirectory)
    }
    const tsConfigPath = ts.findConfigFile(baseDirectory, ts.sys.fileExists)
    directoryToTsConfig.set(baseDirectory, tsConfigPath)
    return tsConfigPath
}

function createLanguageServiceHost(
    fileNames: string[],
    compilerOptions: ts.CompilerOptions
): ts.LanguageServiceHost {

    const getScriptVersion = (filePath: string): string => {
        const modifiedTime = ts.sys.getModifiedTime ? ts.sys.getModifiedTime(filePath) : null
        return modifiedTime ? modifiedTime.getTime().toString() : '0'
    }

    return {
        getCompilationSettings: () => compilerOptions,
        getNewLine: () => {
            switch (compilerOptions.newLine) {
                case ts.NewLineKind.CarriageReturnLineFeed:
                    return '\r\n'
                case ts.NewLineKind.LineFeed:
                    return '\n'
                default:
                    return ts.sys.newLine
            }
        },
        getScriptFileNames: () => fileNames,
        getScriptVersion,
        getScriptSnapshot: filePath => ts.ScriptSnapshot.fromString(ts.sys.readFile(filePath) || ''),
        getCurrentDirectory: ts.sys.getCurrentDirectory,
        getDefaultLibFileName: ts.getDefaultLibFilePath,
        useCaseSensitiveFileNames: () => ts.sys.useCaseSensitiveFileNames,
        readDirectory: ts.sys.readDirectory,
        readFile: ts.sys.readFile,
        fileExists: ts.sys.fileExists,
        directoryExists: ts.sys.directoryExists,
        getDirectories: ts.sys.getDirectories,
        realpath: ts.sys.realpath
    }
}
