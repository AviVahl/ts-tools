import ts from 'typescript'

/**
 * CommonJS to ESM transformer options
 */
export interface ICjsToEsmTransformerOptions {
    /**
     * Optional filtering callback to indicate whether to
     * transform a `require(request)` call to an import statement,
     * based on its request string.
     */
    shouldTransform?(request: string): boolean
}

/**
 * Transforms CommonJS calls/exports to ESM syntax.
 * If a source file is identified as using `require`, `module`, or `exports`,
 * it is wrapped with the following:
 * ```
 * [generated imports]
 * let exports = {}, module = { exports }
 *
 * [original code]
 *
 * export default module.exports
 * ```
 *
 * Each `require(...)` call is converted to a generated import statement
 * with a unique identifier.
 */
export function createCjsToEsmTransformer(
    options: ICjsToEsmTransformerOptions = {}
): ts.TransformerFactory<ts.SourceFile> {
    return context => sourceFile => transformSourceFile(sourceFile, context, options)
}

function transformSourceFile(
    sourceFile: ts.SourceFile,
    context: ts.TransformationContext,
    { shouldTransform = () => true }: ICjsToEsmTransformerOptions
): ts.SourceFile {
    let fileUsesCommonJs = false

    const newImports: ts.ImportDeclaration[] = []
    sourceFile = ts.visitEachChild(sourceFile, visitCommonJS, context)

    if (fileUsesCommonJs) {
        const newStatements = [
            ...newImports,
            createCjsModuleDefinition(),
            ...sourceFile.statements,
            createCjsExportDefault()
        ]

        sourceFile = ts.updateSourceFileNode(sourceFile, newStatements)
    }

    return sourceFile

    function visitCommonJS(node: ts.Node): ts.Node | ts.Node[] | undefined {
        if (
            ts.isFunctionLike(node) &&
            node.parameters.some(({ name }) => ts.isIdentifier(name) && name.text === 'require')
        ) {
            // do no iterate into bodys of functions defining a `require` parameter
            // mocha's bundle uses this pattern. we don't want to transform `require`
            // calls inside such functions
            return node
        } else if (isCjsExportsAccess(node)) {
            fileUsesCommonJs = true
        } else if (isCJsRequireCall(node) && shouldTransform((node.arguments[0] as ts.StringLiteral).text)) {
            fileUsesCommonJs = true

            const importIdentifier = createImportIdentifier(node)

            newImports.push(
                ts.createImportDeclaration(
                    undefined /* decorators */,
                    undefined /* modifiers */,
                    ts.createImportClause(importIdentifier, undefined /* namedBindings */),
                    node.arguments[0]
                )
            )

            // replace require call with identifier
            return importIdentifier
        }

        return ts.visitEachChild(node, visitCommonJS, context)
    }
}

// export default module.exports
function createCjsExportDefault() {
    return ts.createExportDefault(ts.createPropertyAccess(ts.createIdentifier('module'), 'exports'))
}

// unique identifier generation
function createImportIdentifier(node: ts.CallExpression) {
    const { parent } = node
    if (parent && ts.isVariableDeclaration(parent) && ts.isIdentifier(parent.name)) {
        // var libName = require(...)
        // so use libName
        return ts.createUniqueName(parent.name.text)
    } else {
        // use _imported_1, _imported_2, etc
        return ts.createUniqueName('_imported')
    }
}

// let exports = {}, module = { exports }
function createCjsModuleDefinition() {
    return ts.createVariableStatement(undefined /* modifiers */, ts.createVariableDeclarationList([
        ts.createVariableDeclaration('exports', undefined /* type */, ts.createObjectLiteral()),
        ts.createVariableDeclaration(
            'module',
            undefined /* type */,
            ts.createObjectLiteral([ts.createShorthandPropertyAssignment('exports')])
        )
    ], ts.NodeFlags.Let))
}

// module['exports'], module.exports or exports.<something>
function isCjsExportsAccess(node: ts.Node): boolean {
    if (
        ts.isElementAccessExpression(node) &&
        ts.isIdentifier(node.expression) &&
        node.expression.text === 'module' &&
        ts.isStringLiteral(node.argumentExpression)
    ) {
        // module['exports']
        return node.argumentExpression.text === 'exports'
    } else if (ts.isPropertyAccessExpression(node) && ts.isIdentifier(node.expression)) {
        return (node.expression.text === 'module' && node.name.text === 'exports') || // module.exports
            (node.expression.text === 'exports') // exports.<something>
    }
    return false
}

// require(...) calls with a single string argument
function isCJsRequireCall(node: ts.Node): node is ts.CallExpression {
    return (
        ts.isCallExpression(node) &&
        ts.isIdentifier(node.expression) &&
        node.expression.text === 'require' &&
        node.arguments.length === 1 &&
        ts.isStringLiteral(node.arguments[0])
    )
}
