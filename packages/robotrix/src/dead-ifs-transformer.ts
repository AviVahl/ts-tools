import * as ts from 'typescript'

/**
 * Detects and removes dead `if` branches.
 * Checks the expression of every `if` statement, and cancels out always falsy branches.
 * It detects `true`, `false`, and basic string equality comparison.
 */
export function deadIfsTransformer(context: ts.TransformationContext): ts.Transformer<ts.SourceFile> {
    return sourceFile => {
        return ts.visitEachChild(sourceFile, visitIfStatements, context)
    }

    function visitIfStatements(node: ts.Node): ts.Node | ts.Node[] | undefined {
        if (ts.isIfStatement(node)) {
            const expression = visitIfExpression(node.expression)

            if (expression.kind === ts.SyntaxKind.TrueKeyword) {
                // replace expression with `true` and else (if exists) with an empty block
                node = ts.updateIf(node, expression, node.thenStatement, undefined)
            } else if (expression.kind === ts.SyntaxKind.FalseKeyword) {
                // replace expression with `false` and then with an empty block
                node = ts.updateIf(node, expression, ts.createBlock([]), node.elseStatement)
            }
        }

        return ts.visitEachChild(node, visitIfStatements, context)
    }
}

/**
 * Finds string literal comparisons and replaces them with true/false.
 */
function visitIfExpression(node: ts.Expression): ts.Expression {
    if (
        ts.isBinaryExpression(node) &&
        ts.isStringLiteral(node.left) &&
        ts.isStringLiteral(node.right)
    ) {
        const { kind } = node.operatorToken
        if (
            // operator is `==` or `===`
            kind === ts.SyntaxKind.EqualsEqualsEqualsToken ||
            kind === ts.SyntaxKind.EqualsEqualsToken
        ) {
            const newNode = node.left.text === node.right.text ? ts.createTrue() : ts.createFalse()
            const originalText = node.getText()
            if (!originalText.includes(`*/`)) {
                ts.addSyntheticTrailingComment(newNode, ts.SyntaxKind.MultiLineCommentTrivia, ` ${originalText} `)
            }
            return newNode
        } else if (
            // operator is `!=` or `!==`
            kind === ts.SyntaxKind.ExclamationEqualsEqualsToken ||
            kind === ts.SyntaxKind.ExclamationEqualsToken
        ) {
            const newNode = node.left.text !== node.right.text ? ts.createTrue() : ts.createFalse()
            const originalText = node.getText()
            if (!originalText.includes(`*/`)) {
                ts.addSyntheticTrailingComment(newNode, ts.SyntaxKind.MultiLineCommentTrivia, ` ${originalText} `)
            }
            return newNode
        }
    }
    return node
}
