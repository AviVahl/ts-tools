import ts from 'typescript';
import { IBaseHost, ITranspilationOutput, IParsedConfig, ITranspilationOptions } from './types';
import { createBaseHost, createLanguageServiceHost } from './create-host';

/**
 * On-demand TypeScript tranpilation service.
 */
export class TypeScriptService {
    /**
     * Currently loaded TypeScript configurations.
     */
    public parsedConfigs = new Map<string, IParsedConfig>();

    /**
     * Currently running TypeScript lanuage services.
     */
    public runningServices = new Map<string, ts.LanguageService>();

    // might create multiple language services, so share documents between them
    private documentRegistries: Map<string, ts.DocumentRegistry> = new Map();

    // cache of `directory path` to `tsconfig lookup result`, to save disk operations
    private directoryToTsConfig = new Map<string, string | undefined>();

    /**
     * Transpile a TypeScript file.
     * Uses existing loaded configs, if any targets `filePath`.
     * Otherwise, looks up config and uses it to transpile.
     *
     * @param filePath absolute path of the source file to transpile.
     * @param transpileOptions transpilation options to use when no already-running language service targets `filePath`.
     */
    public transpileFile(filePath: string, transpileOptions: ITranspilationOptions): ITranspilationOutput {
        const {
            getBaseHost = createBaseHost,
            configFileName,
            typeCheck = true,
            configLookup = true
        } = transpileOptions;

        // search for an already-loaded config that targets `filePath`
        for (const existingConfig of this.parsedConfigs.values()) {
            if (existingConfig.normalizedFileNames.has(filePath)) {
                if (typeCheck) {
                    return this.transpileUsingLanguageService(
                        filePath,
                        this.getLanguageService(existingConfig, transpileOptions),
                        existingConfig.baseHost
                    );
                } else {
                    return this.transpileIsolated(
                        filePath,
                        existingConfig.compilerOptions,
                        existingConfig.baseHost,
                        transpileOptions
                    );
                }
            }
        }

        // create base host
        const baseHost = getBaseHost();
        const { dirname, fileExists } = baseHost;

        if (!configLookup) {
            // user explicitly specified no tsconfig lookup
            return this.transpileIsolated(filePath, /* userTsconfig */ undefined, baseHost, transpileOptions);
        }

        // search for tsconfig
        const containingDirectoryPath = dirname(filePath);
        const configFilePath = this.findConfigFile(containingDirectoryPath, fileExists, configFileName);

        if (!configFilePath) {
            // couldn't find tsconfig, so tranpile w/o type checking
            return this.transpileIsolated(filePath, /* userTsconfig */ undefined, baseHost, transpileOptions);
        }

        // create a new language service based on tsconfig
        const { config, errors } = this.parseConfigFile(configFilePath, baseHost);

        // config errors are a deal breaker
        if (errors.length) {
            return {
                baseHost,
                diagnostics: errors,
                filePath,
                outputText: ''
            };
        }

        if (typeCheck) {
            const { normalizedFileNames } = config;
            const languageService = this.getLanguageService(config, transpileOptions);

            if (normalizedFileNames.has(filePath)) {
                // service includes our file, so use it to transpile
                return this.transpileUsingLanguageService(filePath, languageService, baseHost);
            }
        }

        // no matching service, so tranpile w/o type checking
        return this.transpileIsolated(filePath, config.compilerOptions, baseHost, transpileOptions);
    }

    /**
     * Clears all running language services, document registries,
     * and tsconfig resolution cache.
     */
    public clear() {
        this.parsedConfigs.clear();
        this.runningServices.clear();
        this.documentRegistries.clear();
        this.directoryToTsConfig.clear();
    }

    public parseConfigFile(configFilePath: string, baseHost: IBaseHost): {
        errors: ts.Diagnostic[],
        config: IParsedConfig
    } {
        const { readFile, dirname, normalize } = baseHost;

        // read and parse config
        const jsonSourceFile = ts.readJsonConfigFile(configFilePath, readFile);
        const configDirectoryPath = dirname(configFilePath);

        const { errors, fileNames, options } = ts.parseJsonSourceFileConfigFileContent(
            jsonSourceFile,
            baseHost,
            configDirectoryPath
        );
        const normalizedFileNames = new Set(fileNames.map(normalize));

        const existingConfig = this.parsedConfigs.get(configFilePath);

        if (existingConfig) {
            existingConfig.rootFileNames = fileNames;
            existingConfig.normalizedFileNames = normalizedFileNames;
            existingConfig.compilerOptions = options;
            return { errors, config: existingConfig };
        } else {
            const parsedConfig: IParsedConfig = {
                configFilePath,
                baseHost,
                compilerOptions: options,
                rootFileNames: fileNames,
                normalizedFileNames,
            };
            this.parsedConfigs.set(configFilePath, parsedConfig);
            return {
                errors,
                config: parsedConfig
            };
        }
    }

    /**
     * Find the closest `tsconfig.json` file to the provided `baseDirectory`.
     *
     * @param baseDirectory the directory to start looking from.
     * @param fileExists function that accepts a path and returns true/false if it points to a file.
     * @param configFileName configuration file name (defaults to `tsconfig.json`).
     */
    public findConfigFile(
        baseDirectory: string,
        fileExists: IBaseHost['fileExists'],
        configFileName?: string
    ): string | undefined {
        if (this.directoryToTsConfig.has(baseDirectory)) {
            return this.directoryToTsConfig.get(baseDirectory);
        }
        const tsConfigPath = ts.findConfigFile(baseDirectory, fileExists, configFileName);
        this.directoryToTsConfig.set(baseDirectory, tsConfigPath);
        return tsConfigPath;
    }

    public getLanguageService(
        config: IParsedConfig,
        transpileOptions: ITranspilationOptions,
    ): ts.LanguageService {
        const { baseHost, configFilePath } = config;

        const existingService = this.runningServices.get(configFilePath);
        if (existingService) {
            return existingService;
        }

        const { getCustomTransformers, getCompilerOptions } = transpileOptions;

        const getResolvedCustomTransformers = getCustomTransformers &&
            (() => getCustomTransformers(baseHost, config.compilerOptions));

        // use lookup on `config`, as `compilerOptions` might be later updated
        const getCompilationSettings = () => getCompilerOptions(baseHost, config.compilerOptions);

        // use lookup on `config, as `roorFileNames` might be later updated
        const getScriptFileNames = () => config.rootFileNames;

        const languageServiceHost = createLanguageServiceHost(
            baseHost,
            getScriptFileNames,
            getCompilationSettings,
            getResolvedCustomTransformers
        );

        const { getCurrentDirectory, useCaseSensitiveFileNames } = baseHost;
        const documentRegistry = this.getDocumentRegistry(getCurrentDirectory(), useCaseSensitiveFileNames);

        const languageService = ts.createLanguageService(languageServiceHost, documentRegistry);

        this.runningServices.set(configFilePath, languageService);
        return languageService;
    }

    private transpileUsingLanguageService(
        filePath: string,
        languageService: ts.LanguageService,
        baseHost: IBaseHost
    ): ITranspilationOutput {
        const { outputFiles, emitSkipped } = languageService.getEmitOutput(filePath);

        if (emitSkipped) {
            return {
                filePath,
                diagnostics: [
                    this.createErrorDiagnostic('Emit was skipped')
                ],
                outputText: '',
                baseHost
            };
        }

        const [jsOutputFile] = outputFiles.filter(({ name }) => name.endsWith('.js'));

        if (!jsOutputFile) {
            return {
                filePath,
                diagnostics: [
                    this.createErrorDiagnostic('No js output file was found')
                ],
                outputText: '',
                baseHost
            };
        }

        const [sourceMapOutputFile] = outputFiles.filter(outputFile => outputFile.name.endsWith('.js.map'));

        const sourceMapText = sourceMapOutputFile && sourceMapOutputFile.text;

        const program = languageService.getProgram();
        const sourceFile = program && program.getSourceFile(filePath);

        const syntacticDiagnostics = languageService.getSyntacticDiagnostics(filePath);
        let diagnostics: ts.Diagnostic[] | undefined;

        if (syntacticDiagnostics.length) {
            diagnostics = syntacticDiagnostics;
        } else {
            const semanticDiagnostics = languageService.getSemanticDiagnostics(filePath);
            if (semanticDiagnostics.length) {
                diagnostics = semanticDiagnostics;
            }
        }

        return {
            diagnostics,
            filePath,
            outputText: jsOutputFile.text,
            sourceMapText,
            baseHost,
            resolvedModules: sourceFile && sourceFile.resolvedModules
        };
    }

    private transpileIsolated(
        filePath: string,
        tsconfigOptions: ts.CompilerOptions | undefined,
        baseHost: IBaseHost,
        { getCustomTransformers, getCompilerOptions }: ITranspilationOptions
    ): ITranspilationOutput {
        const tsCode = baseHost.readFile(filePath);
        if (tsCode === undefined) {
            return {
                filePath,
                diagnostics: [
                    this.createErrorDiagnostic(`Unable to read ${filePath}`)
                ],
                outputText: '',
                baseHost
            };
        }
        const transformers = getCustomTransformers && getCustomTransformers(baseHost, tsconfigOptions);
        const compilerOptions = getCompilerOptions(baseHost, tsconfigOptions);

        const { outputText, diagnostics, sourceMapText } = ts.transpileModule(
            tsCode,
            { compilerOptions, transformers, fileName: filePath }
        );

        return {
            filePath,
            outputText,
            sourceMapText,
            diagnostics,
            baseHost
        };
    }

    private getDocumentRegistry(cwd: string, caseSensitive: boolean): ts.DocumentRegistry {
        const registryKey = cwd + caseSensitive;
        const existingRegistry = this.documentRegistries.get(registryKey);
        if (existingRegistry) {
            return existingRegistry;
        }
        const documentRegistry = ts.createDocumentRegistry(caseSensitive, cwd);
        this.documentRegistries.set(registryKey, documentRegistry);
        return documentRegistry;
    }

    private createErrorDiagnostic(messageText: string): ts.Diagnostic {
        return {
            messageText,
            category: ts.DiagnosticCategory.Error,
            code: ts.DiagnosticCategory.Error,
            file: undefined,
            start: 0,
            length: undefined
        };
    }
}
