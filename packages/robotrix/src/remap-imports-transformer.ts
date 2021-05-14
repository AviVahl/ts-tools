import ts from 'typescript';

export interface IRemapImportsTransformerOptions {
  remapTarget(target: string, containingFile: string, sourceFile: ts.SourceFile): string;
}

/**
 * Remaps esnext and commonjs imports.
 */
export function createRemapImportsTransformer({
  remapTarget,
}: IRemapImportsTransformerOptions): ts.TransformerFactory<ts.SourceFile> {
  return (context) =>
    (sourceFile: ts.SourceFile): ts.SourceFile =>
      remapSourceFileImports(sourceFile, context, remapTarget);
}

export function remapSourceFileImports(
  sourceFile: ts.SourceFile,
  context: ts.TransformationContext,
  remapTarget: IRemapImportsTransformerOptions['remapTarget']
): ts.SourceFile {
  const { factory } = context;
  const { fileName } = sourceFile;
  return ts.visitEachChild(sourceFile, visitStaticImportsExports, context);

  /**
   * Visitor for static imports/re-exports, such as:
   *
   * import {something} from 'target'
   * import * as something from 'target'
   *
   * export {something} from 'target'
   * export * from 'target'
   */
  function visitStaticImportsExports(node: ts.Node): ts.Node | ts.Node[] {
    if (ts.isImportDeclaration(node) && ts.isStringLiteral(node.moduleSpecifier)) {
      const originalTarget = node.moduleSpecifier.text;
      const remappedTarget = remapTarget(originalTarget, fileName, sourceFile);
      if (originalTarget !== remappedTarget) {
        return factory.updateImportDeclaration(
          node,
          node.decorators,
          node.modifiers,
          node.importClause,
          factory.createStringLiteral(remappedTarget)
        );
      }
    } else if (ts.isExportDeclaration(node) && node.moduleSpecifier && ts.isStringLiteral(node.moduleSpecifier)) {
      const originalTarget = node.moduleSpecifier.text;
      const remappedTarget = remapTarget(originalTarget, fileName, sourceFile);
      if (originalTarget !== remappedTarget) {
        return factory.updateExportDeclaration(
          node,
          node.decorators,
          node.modifiers,
          node.isTypeOnly,
          node.exportClause,
          factory.createStringLiteral(remappedTarget)
        );
      }
    }

    // if not a static import/re-export, might be a dynamic import
    // so run that recursive visitor on `node`
    return visitDynamicImports(node);
  }

  /**
   * Visitor for dynamic and commonjs imports, such as:
   *
   * import('target').then(...)
   * require('target')
   */
  function visitDynamicImports(node: ts.Node): ts.Node {
    if (
      ts.isCallExpression(node) &&
      (isDynamicImportKeyword(node.expression) || isRequireIdentifier(node.expression)) &&
      node.arguments.length === 1 &&
      ts.isStringLiteral(node.arguments[0]!)
    ) {
      const [{ text }] = node.arguments;
      const remappedTarget = remapTarget(text, fileName, sourceFile);
      if (text !== remappedTarget) {
        return factory.updateCallExpression(node, node.expression, node.typeArguments, [
          factory.createStringLiteral(remappedTarget),
        ]);
      }
    }

    return ts.visitEachChild(node, visitDynamicImports, context);
  }
}

function isRequireIdentifier(expression: ts.LeftHandSideExpression): expression is ts.Identifier {
  return ts.isIdentifier(expression) && expression.text === 'require';
}

function isDynamicImportKeyword(expression: ts.LeftHandSideExpression) {
  return expression.kind === ts.SyntaxKind.ImportKeyword;
}
