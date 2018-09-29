import * as ts from 'typescript'
import { ITypeScriptServiceHost, ITranspilationOutput, ILanguageServiceInstance } from './types'

export interface ITranspilationOptions {
    host: ITypeScriptServiceHost

    /**
     * Compiler options to override when transpiling files using
     * found `tsconfig.json`.
     */
    tsConfigOverride?: ts.CompilerOptions

    /**
     * Compiler options to use when no tsconfig is found.
     */
    noConfigOptions?: ts.CompilerOptions

    /**
     * TypeScript configuration file name.
     *
     * @default 'tsconfig.json'
     */
    tsconfigFileName?: string

    /**
     * Transformers to apply during transpilation.
     *
     * @param userOptions user's own tsconfig options, if found
     */
    getCustomTransformers?(
        userOptions?: ts.CompilerOptions
    ): ts.CustomTransformers | undefined
}

/**
 * On-demand TypeScript tranpilation service
 * Options can be provided during construction
 *
 * @example
 * new TypeScriptService()
 * new TypeScriptService({ tsconfigFileName: 'tsconfig.test.json' })
 */
export class TypeScriptService {
    // a map holding `tsconfig path` to a `language service instance`
    public runningServices = new Map<string, ILanguageServiceInstance>()

    // we might create more than a single language service per service, so we share documents between them
    private documentRegistries: Map<string, ts.DocumentRegistry> = new Map()

    // cache of `directory path` to `tsconfig lookup result`, to save disk operations
    private directoryToTsConfig = new Map<string, string | undefined>()

    /**
     * Transpile a TypeScript file on the native file system
     *
     * @param filePath absolute path of the source file to transpile
     */
    public transpileFile(
        filePath: string,
        transpileOptions: ITranspilationOptions
    ): ITranspilationOutput {
        for (const existingInstance of this.runningServices.values()) {
            if (existingInstance.rootFileNames.has(filePath)) {
                return this.transpileUsingLanguageService(filePath, existingInstance.languageService)
            }
        }

        const { host, tsconfigFileName } = transpileOptions
        const fileDirectoryPath = host.dirname(filePath)
        const configFilePath = this.getTsConfigPath(fileDirectoryPath, host.fileExistsSync, tsconfigFileName)

        if (!configFilePath) {
            return this.transpileIsolated(filePath, transpileOptions)
        }
        const { errors, fileNames, options: userOptions } = this.loadConfigFile(configFilePath, host)

        if (errors.length) {
            return {
                diagnostics: errors,
                filePath,
                outputText: ''
            }
        }

        const { languageService, rootFileNames } = this.createLanguageService(
            configFilePath,
            fileNames,
            transpileOptions,
            userOptions
        )

        if (rootFileNames.has(filePath)) {
            return this.transpileUsingLanguageService(filePath, languageService)
        }

        return this.transpileIsolated(filePath, transpileOptions)
    }

    /**
     * Load a tsconfig file pointed to by `configFilePath`.
     *
     * @param configFilePath absolute path to the configuration file
     */
    private loadConfigFile(configFilePath: string, host: ITypeScriptServiceHost): ts.ParsedCommandLine {
        const {
            fileExistsSync: fileExists,
            readFileSync: readFile,
            dirname,
            readDirectory,
            isCaseSensitive: useCaseSensitiveFileNames
        } = host

        const jsonSourceFile = ts.readJsonConfigFile(configFilePath, readFile)
        const configDirectoryPath = dirname(configFilePath)
        return ts.parseJsonSourceFileConfigFileContent(
            jsonSourceFile, { fileExists, readDirectory, readFile, useCaseSensitiveFileNames }, configDirectoryPath
        )
    }

    private transpileUsingLanguageService(
        filePath: string,
        languageService: ts.LanguageService
    ): ITranspilationOutput {
        const { outputFiles, emitSkipped } = languageService.getEmitOutput(filePath)

        if (emitSkipped) {
            return {
                filePath,
                diagnostics: [
                    this.createErrorDiagnostic('Emit was skipped')
                ],
                outputText: ''
            }
        }

        const jsOutputFile = outputFiles.filter(outputFile => outputFile.name.endsWith('.js')).shift()

        if (!jsOutputFile) {
            return {
                filePath,
                diagnostics: [
                    this.createErrorDiagnostic('No js output file was found')
                ],
                outputText: ''
            }
        }
        const sourceMapOutputFile = outputFiles.filter(outputFile => outputFile.name.endsWith('.js.map')).shift()
        const sourceMapText = sourceMapOutputFile && sourceMapOutputFile.text
        const syntacticDiagnostics = languageService.getSyntacticDiagnostics(filePath)

        if (syntacticDiagnostics.length) {
            return {
                diagnostics: syntacticDiagnostics,
                filePath,
                outputText: jsOutputFile.text,
                sourceMapText
            }
        }

        const semanticDiagnostics = languageService.getSemanticDiagnostics(filePath)
        if (semanticDiagnostics.length) {
            return {
                diagnostics: semanticDiagnostics,
                filePath,
                outputText: jsOutputFile.text,
                sourceMapText
            }
        }

        return {
            filePath,
            outputText: jsOutputFile.text,
            sourceMapText
        }
    }

    private transpileIsolated(
        filePath: string,
        options: ITranspilationOptions
    ): ITranspilationOutput {
        const { getCustomTransformers, host, noConfigOptions } = options
        const tsCode = host.readFileSync(filePath)
        if (!tsCode) {
            return {
                filePath,
                diagnostics: [
                    this.createErrorDiagnostic(`Unable to read ${filePath}`)
                ],
                outputText: ''
            }
        }
        const { outputText, diagnostics, sourceMapText } = ts.transpileModule(tsCode, {
            fileName: filePath,
            compilerOptions: noConfigOptions,
            transformers: getCustomTransformers && getCustomTransformers(noConfigOptions)
        })

        return {
            filePath,
            outputText,
            sourceMapText,
            diagnostics
        }
    }

    /**
     * Find the closest `tsconfig.json` file to the provided baseDirectory
     *
     * @param baseDirectory the directory to start looking from
     */
    private getTsConfigPath(
        baseDirectory: string,
        fileExistsSync: ITypeScriptServiceHost['fileExistsSync'],
        tsconfigFileName?: string
    ): string | undefined {
        if (this.directoryToTsConfig.has(baseDirectory)) {
            return this.directoryToTsConfig.get(baseDirectory)
        }
        const tsConfigPath = ts.findConfigFile(baseDirectory, fileExistsSync, tsconfigFileName)
        this.directoryToTsConfig.set(baseDirectory, tsConfigPath)
        return tsConfigPath
    }

    private createLanguageService(
        configFilePath: string,
        fileNames: string[],
        transpileOptions: ITranspilationOptions,
        userOptions: ts.CompilerOptions
    ): ILanguageServiceInstance {
        const { host, getCustomTransformers, tsConfigOverride } = transpileOptions
        const {
            newLine,
            getModifiedTime,
            readFileSync: readFile,
            cwd,
            fileExistsSync: fileExists,
            directoryExistsSync: directoryExists,
            readDirectory,
            getDefaultLibFilePath: getDefaultLibFileName,
            isCaseSensitive,
            readdirSync: getDirectories,
            realpathSync: realpath
        } = host

        const customTransformers = getCustomTransformers && getCustomTransformers(userOptions)
        const resolvedOptions: ts.CompilerOptions = { ...userOptions, ...tsConfigOverride }

        const languageServiceHost: ts.LanguageServiceHost = {
            getCompilationSettings: () => resolvedOptions,
            getNewLine: () => {
                switch (resolvedOptions.newLine) {
                    case ts.NewLineKind.CarriageReturnLineFeed:
                        return '\r\n'
                    case ts.NewLineKind.LineFeed:
                        return '\n'
                    default:
                        return newLine
                }
            },
            getScriptFileNames: () => fileNames,
            getScriptVersion: filePath => {
                const modifiedTime = getModifiedTime(filePath)
                return modifiedTime ? `${modifiedTime.getTime()}` : `${Date.now()}`
            },
            getScriptSnapshot: filePath => ts.ScriptSnapshot.fromString(readFile(filePath) || ''),
            getCurrentDirectory: () => cwd,
            getDefaultLibFileName,
            useCaseSensitiveFileNames: () => isCaseSensitive,
            readDirectory,
            readFile,
            fileExists,
            directoryExists,
            getDirectories,
            realpath,
            getCustomTransformers: () => customTransformers
        }

        const documentRegistry = this.getDocumentRegistry(host.cwd, host.isCaseSensitive)

        const serviceInstance: ILanguageServiceInstance = {
            rootFileNames: new Set(fileNames.map(host.normalize)),
            languageService: ts.createLanguageService(languageServiceHost, documentRegistry)
        }

        this.runningServices.set(configFilePath, serviceInstance)

        return serviceInstance
    }

    private getDocumentRegistry(cwd: string, isCaseSensitive: boolean): ts.DocumentRegistry {
        const registryKey = cwd + isCaseSensitive
        const existingRegistry = this.documentRegistries.get(registryKey)
        if (existingRegistry) {
            return existingRegistry
        }
        const documentRegistry = ts.createDocumentRegistry(isCaseSensitive, cwd)
        this.documentRegistries.set(registryKey, documentRegistry)
        return documentRegistry
    }

    private createErrorDiagnostic(messageText: string): ts.Diagnostic {
        return {
            messageText,
            category: ts.DiagnosticCategory.Error,
            code: ts.DiagnosticCategory.Error,
            file: undefined,
            start: 0,
            length: undefined
        }
    }
}
