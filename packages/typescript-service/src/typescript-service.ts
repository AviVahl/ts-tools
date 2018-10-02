import * as ts from 'typescript'
import { IBaseHost, ICustomFs, ITranspilationOutput, ILanguageServiceInstance } from './types'
import {
    createDefaultBaseHost,
    createCustomBaseHost,
    createDefaultLanguageServiceHost,
    createCustomLanguageServiceHost
} from './create-host'

export interface ITranspilationOptions {
    /**
     * This can be provided so that hosts are built around the custom fs.
     */
    customFs?: ICustomFs

    /**
     * Absolute path to the current working directory.
     */
    cwd?: string

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

    // might create multiple language services, so share documents between them
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
        // search and use an existing service that targets `filePath`
        for (const existingInstance of this.runningServices.values()) {
            if (existingInstance.rootFileNames.has(filePath)) {
                return this.transpileUsingLanguageService(
                    filePath, existingInstance.languageService, existingInstance.baseHost
                )
            }
        }

        // create base host
        const { customFs, tsconfigFileName, cwd = ts.sys.getCurrentDirectory() } = transpileOptions
        const baseHost = customFs ? createCustomBaseHost(cwd, customFs) : createDefaultBaseHost(cwd)
        const { dirname, fileExists, readFile } = baseHost
        const fileDirectoryPath = dirname(filePath)

        // search for tsconfig
        const configFilePath = this.getTsConfigPath(fileDirectoryPath, fileExists, tsconfigFileName)

        if (!configFilePath) {
            // couldn't find tsconfig, so tranpile w/o type checking
            return this.transpileIsolated(filePath, baseHost, transpileOptions)
        }

        // read and parse config
        const jsonSourceFile = ts.readJsonConfigFile(configFilePath, readFile)
        const configDirectoryPath = dirname(configFilePath)

        const {
            errors,
            fileNames,
            options: userOptions
        } = ts.parseJsonSourceFileConfigFileContent(jsonSourceFile, baseHost, configDirectoryPath)

        if (errors.length) {
            return {
                diagnostics: errors,
                filePath,
                outputText: '',
                baseHost
            }
        }

        // create a new language service based on tsconfig
        const serviceInstance = this.createLanguageService(
            fileNames, baseHost, transpileOptions, userOptions
        )

        // register new language service
        this.runningServices.set(configFilePath, serviceInstance)

        const { languageService, rootFileNames } = serviceInstance

        if (rootFileNames.has(filePath)) {
            // service includes our file, so use it to transpile
            return this.transpileUsingLanguageService(filePath, languageService, baseHost)
        }

        // no matching service, so tranpile w/o type checking
        return this.transpileIsolated(filePath, baseHost, transpileOptions)
    }

    private transpileUsingLanguageService(
        filePath: string,
        languageService: ts.LanguageService,
        baseHost: IBaseHost
    ): ITranspilationOutput {
        const { outputFiles, emitSkipped } = languageService.getEmitOutput(filePath)

        if (emitSkipped) {
            return {
                filePath,
                diagnostics: [
                    this.createErrorDiagnostic('Emit was skipped')
                ],
                outputText: '',
                baseHost
            }
        }

        const jsOutputFile = outputFiles.filter(outputFile => outputFile.name.endsWith('.js')).shift()

        if (!jsOutputFile) {
            return {
                filePath,
                diagnostics: [
                    this.createErrorDiagnostic('No js output file was found')
                ],
                outputText: '',
                baseHost
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
                sourceMapText,
                baseHost
            }
        }

        const semanticDiagnostics = languageService.getSemanticDiagnostics(filePath)
        if (semanticDiagnostics.length) {
            return {
                diagnostics: semanticDiagnostics,
                filePath,
                outputText: jsOutputFile.text,
                sourceMapText,
                baseHost
            }
        }

        return {
            filePath,
            outputText: jsOutputFile.text,
            sourceMapText,
            baseHost
        }
    }

    private transpileIsolated(
        filePath: string,
        baseHost: IBaseHost,
        options: ITranspilationOptions
    ): ITranspilationOutput {
        const { getCustomTransformers, noConfigOptions } = options
        const tsCode = baseHost.readFile(filePath)
        if (!tsCode) {
            return {
                filePath,
                diagnostics: [
                    this.createErrorDiagnostic(`Unable to read ${filePath}`)
                ],
                outputText: '',
                baseHost
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
            diagnostics,
            baseHost
        }
    }

    /**
     * Find the closest `tsconfig.json` file to the provided baseDirectory
     *
     * @param baseDirectory the directory to start looking from
     */
    private getTsConfigPath(
        baseDirectory: string,
        fileExists: IBaseHost['fileExists'],
        tsconfigFileName?: string
    ): string | undefined {
        if (this.directoryToTsConfig.has(baseDirectory)) {
            return this.directoryToTsConfig.get(baseDirectory)
        }
        const tsConfigPath = ts.findConfigFile(baseDirectory, fileExists, tsconfigFileName)
        this.directoryToTsConfig.set(baseDirectory, tsConfigPath)
        return tsConfigPath
    }

    private createLanguageService(
        fileNames: string[],
        baseHost: IBaseHost,
        transpileOptions: ITranspilationOptions,
        userOptions: ts.CompilerOptions
    ): ILanguageServiceInstance {
        const { customFs, getCustomTransformers, tsConfigOverride } = transpileOptions

        const customTransformers = getCustomTransformers && getCustomTransformers(userOptions)
        const resolvedOptions: ts.CompilerOptions = { ...userOptions, ...tsConfigOverride }

        const languageServiceHost = customFs ?
            createCustomLanguageServiceHost(baseHost, fileNames, resolvedOptions, customFs, customTransformers) :
            createDefaultLanguageServiceHost(baseHost, fileNames, resolvedOptions, customTransformers)

        const { getCurrentDirectory, useCaseSensitiveFileNames } = baseHost
        const documentRegistry = this.getDocumentRegistry(getCurrentDirectory(), useCaseSensitiveFileNames)

        const serviceInstance: ILanguageServiceInstance = {
            baseHost,
            rootFileNames: new Set(fileNames.map(baseHost.normalize)),
            languageService: ts.createLanguageService(languageServiceHost, documentRegistry)
        }

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
