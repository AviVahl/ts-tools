import ts from 'typescript';

/**
 * CommonJS to ESM transformer options
 */
export interface ICjsToEsmTransformerOptions {
  /**
   * Optional filtering callback to indicate whether to
   * transform a `require(request)` call to an import statement,
   * based on its request string.
   */
  shouldTransform?(request: string): boolean;
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
  return (context) => (sourceFile: ts.SourceFile): ts.SourceFile => transformSourceFile(sourceFile, context, options);
}

function transformSourceFile(
  sourceFile: ts.SourceFile,
  context: ts.TransformationContext,
  { shouldTransform = () => true }: ICjsToEsmTransformerOptions
): ts.SourceFile {
  if (sourceFile.statements.some((node) => ts.isImportDeclaration(node) || ts.isExportDeclaration(node))) {
    // file has esm, so avoid cjs conversion.
    return sourceFile;
  }

  let fileUsesCommonJs = false;

  const { factory } = context;
  const newImports: ts.ImportDeclaration[] = [];
  sourceFile = ts.visitEachChild(sourceFile, visitCommonJS, context);

  if (fileUsesCommonJs) {
    const newStatements = [
      ...newImports,
      createCjsModuleDefinition(factory),
      ...sourceFile.statements,
      createCjsExportDefault(factory),
    ];

    sourceFile = factory.updateSourceFile(sourceFile, newStatements);
  }

  return sourceFile;

  function visitCommonJS(node: ts.Node): ts.Node | ts.Node[] | undefined {
    if (
      ts.isFunctionLike(node) &&
      node.parameters.some(({ name }) => ts.isIdentifier(name) && name.text === 'require')
    ) {
      // do no iterate into bodies of functions defining a `require` parameter.
      // mocha's bundle uses this pattern. avoid transforming `require` calls inside such functions.
      return node;
    } else if (ts.isTryStatement(node)) {
      // heuristic for conditionally required libs (inside try/catch).
      // typescript bundle uses this pattern to require `source-map-support`.
      return node;
    } else if (isModuleExportsElementAccess(node) || isExportsPropertyAccess(node) || isTypeOfExports(node)) {
      fileUsesCommonJs = true;
    } else if (isCJsRequireCall(node) && shouldTransform((node.arguments[0] as ts.StringLiteral).text)) {
      fileUsesCommonJs = true;

      const importIdentifier = createImportIdentifier(node, factory);

      newImports.push(
        factory.createImportDeclaration(
          undefined /* decorators */,
          undefined /* modifiers */,
          factory.createImportClause(false, importIdentifier, undefined /* namedBindings */),
          node.arguments[0]!
        )
      );

      // replace require call with identifier
      return importIdentifier;
    }

    return ts.visitEachChild(node, visitCommonJS, context);
  }
}

// export default module.exports
function createCjsExportDefault(factory: ts.NodeFactory) {
  return factory.createExportDefault(
    factory.createPropertyAccessExpression(factory.createIdentifier('module'), 'exports')
  );
}

// unique identifier generation
function createImportIdentifier(node: ts.CallExpression, factory: ts.NodeFactory) {
  const { parent } = node;
  if (parent && ts.isVariableDeclaration(parent) && ts.isIdentifier(parent.name)) {
    // var libName = require(...)
    // so use libName
    return factory.createUniqueName(parent.name.text);
  } else {
    // use _imported_1, _imported_2, etc
    return factory.createUniqueName('_imported');
  }
}

// let exports = {}, module = { exports }
function createCjsModuleDefinition(factory: ts.NodeFactory) {
  return factory.createVariableStatement(
    undefined /* modifiers */,
    factory.createVariableDeclarationList(
      [
        factory.createVariableDeclaration(
          'exports',
          undefined /* exclamationToken */,
          undefined /* type */,
          factory.createObjectLiteralExpression()
        ),
        factory.createVariableDeclaration(
          'module',
          undefined /* exclamationToken */,
          undefined /* type */,
          factory.createObjectLiteralExpression([factory.createShorthandPropertyAssignment('exports')])
        ),
      ],
      ts.NodeFlags.Let
    )
  );
}

// require(...) calls with a single string argument
const isCJsRequireCall = (node: ts.Node): node is ts.CallExpression =>
  ts.isCallExpression(node) &&
  ts.isIdentifier(node.expression) &&
  node.expression.text === 'require' &&
  node.arguments.length === 1 &&
  ts.isStringLiteral(node.arguments[0]!);

// module['exports']
const isModuleExportsElementAccess = (node: ts.Node): node is ts.ElementAccessExpression =>
  ts.isElementAccessExpression(node) &&
  ts.isIdentifier(node.expression) &&
  node.expression.text === 'module' &&
  ts.isStringLiteral(node.argumentExpression) &&
  node.argumentExpression.text === 'exports';

// module.exports OR exports.<something>
const isExportsPropertyAccess = (node: ts.Node): node is ts.PropertyAccessExpression =>
  ts.isPropertyAccessExpression(node) &&
  ts.isIdentifier(node.expression) &&
  ((node.expression.text === 'module' && node.name.text === 'exports') || node.expression.text === 'exports');

// typeof exports
const isTypeOfExports = (node: ts.Node): node is ts.TypeOfExpression =>
  ts.isTypeOfExpression(node) && ts.isIdentifier(node.expression) && node.expression.text === 'exports';
