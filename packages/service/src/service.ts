import ts from 'typescript'
import { IBaseHost, ICustomFs, ITranspilationOutput, ILanguageServiceInstance, ITranspilationOptions } from './types'
import {
    createBaseHost, createCustomFsBaseHost, createLanguageServiceHost, createCustomFsLanguageServiceHost
} from './create-host'

/**
 * On-demand TypeScript tranpilation service.
 */
export class TypeScriptService {
    // a map holding `tsconfig path` to a `language service instance`
    public runningServices = new Map<string, ILanguageServiceInstance>()

    // might create multiple language services, so share documents between them
    private documentRegistries: Map<string, ts.DocumentRegistry> = new Map()

    // cache of `directory path` to `tsconfig lookup result`, to save disk operations
    private directoryToTsConfig = new Map<string, string | undefined>()

    /**
     * Transpile a TypeScript file.
     *
     * @param filePath absolute path of the source file to transpile.
     * @param transpileOptions transpilation options to use when no already-running language service targets `filePath`.
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
        const { getCustomFs, tsconfigFileName, isolated, cwd = ts.sys.getCurrentDirectory() } = transpileOptions
        const customFs = getCustomFs && getCustomFs()
        const baseHost = customFs ? createCustomFsBaseHost(cwd, customFs) : createBaseHost(cwd)
        const { dirname, fileExists, readFile } = baseHost

        if (isolated) {
            // user explicitly specified no tsconfig lookup
            return this.transpileIsolated(filePath, baseHost, transpileOptions)
        }

        // search for tsconfig
        const fileDirectoryPath = dirname(filePath)
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
            options: tsconfigOptions
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
            fileNames, baseHost, transpileOptions, tsconfigOptions, customFs
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

    /**
     * Clears all running language services, document registries,
     * and tsconfig resolution cache.
     */
    public clear() {
        this.runningServices.clear()
        this.documentRegistries.clear()
        this.directoryToTsConfig.clear()
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

        const [jsOutputFile] = outputFiles.filter(outputFile => outputFile.name.endsWith('.js'))

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
        const [sourceMapOutputFile] = outputFiles.filter(outputFile => outputFile.name.endsWith('.js.map'))
        const sourceMapText = sourceMapOutputFile && sourceMapOutputFile.text
        const program = languageService.getProgram()
        const sourceFile = program && program.getSourceFile(filePath)

        const syntacticDiagnostics = languageService.getSyntacticDiagnostics(filePath)
        let diagnostics: ts.Diagnostic[] | undefined

        if (syntacticDiagnostics.length) {
            diagnostics = syntacticDiagnostics
        } else {
            const semanticDiagnostics = languageService.getSemanticDiagnostics(filePath)
            if (semanticDiagnostics.length) {
                diagnostics = semanticDiagnostics
            }
        }

        return {
            diagnostics,
            filePath,
            outputText: jsOutputFile.text,
            sourceMapText,
            baseHost,
            resolvedModules: sourceFile && sourceFile.resolvedModules
        }
    }

    private transpileIsolated(
        filePath: string,
        baseHost: IBaseHost,
        options: ITranspilationOptions
    ): ITranspilationOutput {
        const tsCode = baseHost.readFile(filePath)
        if (tsCode === undefined) {
            return {
                filePath,
                diagnostics: [
                    this.createErrorDiagnostic(`Unable to read ${filePath}`)
                ],
                outputText: '',
                baseHost
            }
        }
        const { getCustomTransformers, getCompilerOptions } = options
        const transformers = getCustomTransformers && getCustomTransformers(baseHost)
        const compilerOptions = getCompilerOptions(baseHost)

        const { outputText, diagnostics, sourceMapText } = ts.transpileModule(
            tsCode,
            { compilerOptions, transformers, fileName: filePath }
        )

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
        tsconfigOptions: ts.CompilerOptions,
        customFs?: ICustomFs
    ): ILanguageServiceInstance {
        const { getCustomTransformers, getCompilerOptions } = transpileOptions

        const customTransformers = getCustomTransformers && getCustomTransformers(baseHost, tsconfigOptions)
        const compilerOptions = getCompilerOptions(baseHost, tsconfigOptions)

        const languageServiceHost = customFs ?
            createCustomFsLanguageServiceHost(baseHost, fileNames, compilerOptions, customFs, customTransformers) :
            createLanguageServiceHost(baseHost, fileNames, compilerOptions, customTransformers)

        const { getCurrentDirectory, useCaseSensitiveFileNames } = baseHost
        const documentRegistry = this.getDocumentRegistry(getCurrentDirectory(), useCaseSensitiveFileNames)

        const serviceInstance: ILanguageServiceInstance = {
            baseHost,
            rootFileNames: new Set(fileNames.map(baseHost.normalize)),
            languageService: ts.createLanguageService(languageServiceHost, documentRegistry)
        }

        return serviceInstance
    }

    private getDocumentRegistry(cwd: string, caseSensitive: boolean): ts.DocumentRegistry {
        const registryKey = cwd + caseSensitive
        const existingRegistry = this.documentRegistries.get(registryKey)
        if (existingRegistry) {
            return existingRegistry
        }
        const documentRegistry = ts.createDocumentRegistry(caseSensitive, cwd)
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
