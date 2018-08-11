import * as ts from 'typescript'

/**
 * Create a transformer factory that replaces `process.env.[PARAM]`
 * expressions with string literals, using provided `env`.
 */
export function createNodeEnvTransformer(env: NodeJS.ProcessEnv): ts.TransformerFactory<ts.SourceFile> {
    return context => {
        return sourceFile => {
            return ts.visitEachChild(sourceFile, visitNodeEnv, context)

            function visitNodeEnv(node: ts.Node): ts.Node | ts.Node[] {
                if (
                    ts.isPropertyAccessExpression(node) &&
                    ts.isPropertyAccessExpression(node.expression) &&
                    node.expression.name.text === 'env' &&
                    ts.isIdentifier(node.expression.expression) &&
                    node.expression.expression.text === 'process' &&
                    env.hasOwnProperty(node.name.text)
                ) {
                    // do lookup inside the if, so we don't do it twice
                    const valueForParam = env[node.name.text]
                    if (valueForParam !== undefined) {
                        return ts.createStringLiteral(valueForParam)
                    }
                }

                return ts.visitEachChild(node, visitNodeEnv, context)
            }
        }
    }
}
