import ts from 'typescript';

const SELF = '__self';
const SOURCE = '__source';
const JSX_FILENAME = '__jsxFileName';

/**
 * Transformer that adds meta-data which is used by React for development error messages.
 *
 * It adds the following attributes to all JSX elements:
 *  1. __self={this}
 *  2. __source={{ fileName: __jsxFileName, lineNumber: [jsx line number] }}
 *
 * if __source was added, the following declaration is prepended to source file:
 *   const __jsxFileName = [absolute file path]
 */
export function reactDevTransformer(context: ts.TransformationContext): ts.Transformer<ts.SourceFile> {
    return sourceFile => {
        const { fileName } = sourceFile; // absolute file path

        // we want to add the __jsxFileName const only if it is used in any added attribute
        let shouldAddFileNameConst = false;

        // file-wide unique identifier that would point to the fileName string literal
        const jsxFileNameIdentifier = ts.createFileLevelUniqueName(JSX_FILENAME);

        // fist run the visitor, so it will mark whether we need to add fileName const declaration
        sourceFile = ts.visitEachChild(sourceFile, addJSXMetadata, context);

        if (shouldAddFileNameConst) {
            sourceFile = addFileNameConst(sourceFile, jsxFileNameIdentifier, fileName);
        }

        return sourceFile;

        function addJSXMetadata(node: ts.Node): ts.Node | ts.Node[] {

            // we only transform jsx attributes nodes that have parent jsx elements
            if (!ts.isJsxAttributes(node) || !node.parent) {
                return ts.visitEachChild(node, addJSXMetadata, context);
            }

            const { userDefinedSelf, userDefinedSource } = findUserDefinedAttributes(node);

            const newAttributes: ts.JsxAttribute[] = [];

            if (!userDefinedSelf) {
                newAttributes.push(createSelfAttribute());
            }

            if (!userDefinedSource) {
                shouldAddFileNameConst = true;
                const { line } = ts.getLineAndCharacterOfPosition(sourceFile, node.parent.pos);
                newAttributes.push(createSourceAttribute(createLocationObject(jsxFileNameIdentifier, line)));
            }

            if (newAttributes.length) {
                // we actually created new attributes, so append them
                node = ts.updateJsxAttributes(node, node.properties.concat(newAttributes));
            }

            // if any of the attributes contain JSX elements, we want to transform them as well
            return ts.visitEachChild(node, addJSXMetadata, context);
        }
    };
}

// iterate over existing properties to check whether user already defined one of the props
function findUserDefinedAttributes(node: ts.JsxAttributes) {
    let userDefinedSelf = false;
    let userDefinedSource = false;

    for (const prop of node.properties) {
        const { name: propName } = prop;
        if (propName && (ts.isIdentifier(propName) || ts.isStringLiteral(propName))) {
            if (propName.text === SELF) {
                userDefinedSelf = true;
            } else if (propName.text === SOURCE) {
                userDefinedSource = true;
            }
        }
    }
    return { userDefinedSelf, userDefinedSource };
}

// __self={this}
function createSelfAttribute(): ts.JsxAttribute {
    return ts.createJsxAttribute(ts.createIdentifier(SELF), ts.createJsxExpression(undefined, ts.createThis()));
}

// __source={ [location-object] }
function createSourceAttribute(locationObj: ts.ObjectLiteralExpression): ts.JsxAttribute {
    return ts.createJsxAttribute(ts.createIdentifier(SOURCE), ts.createJsxExpression(undefined, locationObj));
}

// { fileName: [path-to-file], lineNumber: [element-line-number] }
function createLocationObject(jsxFileNameIdentifier: ts.Identifier, line: number) {
    return ts.createObjectLiteral([
        ts.createPropertyAssignment(
            'fileName',
            jsxFileNameIdentifier // use the file-wide identifier for fileName value
        ),
        ts.createPropertyAssignment(
            'lineNumber',
            ts.createNumericLiteral(String(line + 1))
        )
    ]);
}

// const __jsxFileName = "/path/to/file.ts"
function addFileNameConst(
    sourceFile: ts.SourceFile,
    jsxFileNameIdentifier: ts.Identifier,
    fileName: string
): ts.SourceFile {

    const variableDecls = [
        ts.createVariableDeclaration(
            jsxFileNameIdentifier,
            undefined /* type */,
            ts.createStringLiteral(fileName)
        )
    ];

    return insertStatementAfterImports(
        sourceFile,
        ts.createVariableStatement(
            undefined /* modifiers */,
            ts.createVariableDeclarationList(variableDecls, ts.NodeFlags.Const)
        )
    );
}

// insert a new statement above the first non-import statement
function insertStatementAfterImports(sourceFile: ts.SourceFile, statement: ts.Statement): ts.SourceFile {
    const {statements } = sourceFile;

    const nonImportIdx = statements.findIndex(s => !ts.isImportDeclaration(s));

    const newStatements = nonImportIdx === -1 ?
        [statement, ...statements] :
        [...statements.slice(0, nonImportIdx), statement, ...statements.slice(nonImportIdx)];

    return ts.updateSourceFileNode(sourceFile, newStatements);
}
