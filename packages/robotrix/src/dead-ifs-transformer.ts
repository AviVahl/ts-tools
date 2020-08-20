import ts from 'typescript';

/**
 * Detects and removes dead `if` branches.
 * Checks the expression of every `if` statement, and cancels out always falsy branches.
 * It detects `true`, `false`, and basic string equality comparison.
 */
export function deadIfsTransformer(context: ts.TransformationContext): ts.Transformer<ts.SourceFile> {
  const { factory } = context;
  return (sourceFile) => {
    return ts.visitEachChild(sourceFile, visitIfStatements, context);
  };

  function visitIfStatements(node: ts.Node): ts.Node | ts.Node[] | undefined {
    if (ts.isIfStatement(node)) {
      const expression = visitIfExpression(node.expression, factory);

      if (expression.kind === ts.SyntaxKind.TrueKeyword) {
        // replace expression with `true` and else (if exists) with an empty block
        node = factory.updateIfStatement(node, expression, node.thenStatement, undefined);
      } else if (expression.kind === ts.SyntaxKind.FalseKeyword) {
        // replace expression with `false` and then with an empty block
        node = factory.updateIfStatement(node, expression, factory.createBlock([]), node.elseStatement);
      }
    }

    return ts.visitEachChild(node, visitIfStatements, context);
  }
}

/**
 * Finds string literal comparisons and replaces them with true/false.
 */
function visitIfExpression(node: ts.Expression, factory: ts.NodeFactory): ts.Expression {
  if (ts.isBinaryExpression(node) && ts.isStringLiteral(node.left) && ts.isStringLiteral(node.right)) {
    const { kind } = node.operatorToken;
    if (
      // operator is `==` or `===`
      kind === ts.SyntaxKind.EqualsEqualsEqualsToken ||
      kind === ts.SyntaxKind.EqualsEqualsToken
    ) {
      return node.left.text === node.right.text ? factory.createTrue() : factory.createFalse();
    } else if (
      // operator is `!=` or `!==`
      kind === ts.SyntaxKind.ExclamationEqualsEqualsToken ||
      kind === ts.SyntaxKind.ExclamationEqualsToken
    ) {
      return node.left.text !== node.right.text ? factory.createTrue() : factory.createFalse();
    }
  }
  return node;
}
