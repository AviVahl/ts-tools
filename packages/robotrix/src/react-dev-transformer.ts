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
  const { factory } = context;
  return (sourceFile) => {
    const { fileName } = sourceFile; // absolute file path

    // we want to add the __jsxFileName const only if it is used in any added attribute
    let shouldAddFileNameConst = false;

    // file-wide unique identifier that would point to the fileName string literal
    const jsxFileNameIdentifier = factory.createUniqueName(
      JSX_FILENAME,
      ts.GeneratedIdentifierFlags.Optimistic | ts.GeneratedIdentifierFlags.FileLevel
    );

    // fist run the visitor, so it will mark whether we need to add fileName const declaration
    sourceFile = ts.visitEachChild(sourceFile, addJSXMetadata, context);

    if (shouldAddFileNameConst) {
      sourceFile = addFileNameConst(sourceFile, jsxFileNameIdentifier, fileName, factory);
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
        newAttributes.push(createSelfAttribute(factory));
      }

      if (!userDefinedSource) {
        shouldAddFileNameConst = true;
        const parentJsx = ts.isJsxSelfClosingElement(node.parent) ? node.parent : node.parent.parent;
        const pos = parentJsx.pos;
        const { line } = ts.getLineAndCharacterOfPosition(sourceFile, pos);
        newAttributes.push(createSourceAttribute(createLocationObject(jsxFileNameIdentifier, line, factory), factory));
      }

      if (newAttributes.length) {
        // we actually created new attributes, so append them
        node = factory.updateJsxAttributes(node, node.properties.concat(newAttributes));
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
function createSelfAttribute(factory: ts.NodeFactory): ts.JsxAttribute {
  return factory.createJsxAttribute(
    factory.createIdentifier(SELF),
    factory.createJsxExpression(undefined, factory.createThis())
  );
}

// __source={ [location-object] }
function createSourceAttribute(locationObj: ts.ObjectLiteralExpression, factory: ts.NodeFactory): ts.JsxAttribute {
  return factory.createJsxAttribute(
    factory.createIdentifier(SOURCE),
    factory.createJsxExpression(undefined, locationObj)
  );
}

// { fileName: [path-to-file], lineNumber: [element-line-number] }
function createLocationObject(jsxFileNameIdentifier: ts.Identifier, line: number, factory: ts.NodeFactory) {
  return factory.createObjectLiteralExpression([
    factory.createPropertyAssignment(
      'fileName',
      jsxFileNameIdentifier // use the file-wide identifier for fileName value
    ),
    factory.createPropertyAssignment('lineNumber', factory.createNumericLiteral(String(line + 1))),
  ]);
}

// const __jsxFileName = "/path/to/file.ts"
function addFileNameConst(
  sourceFile: ts.SourceFile,
  jsxFileNameIdentifier: ts.Identifier,
  fileName: string,
  factory: ts.NodeFactory
): ts.SourceFile {
  const variableDecls = [
    factory.createVariableDeclaration(
      jsxFileNameIdentifier,
      undefined /* exclamationToken */,
      undefined /* type */,
      factory.createStringLiteral(fileName)
    ),
  ];

  return insertStatementAfterImports(
    sourceFile,
    factory.createVariableStatement(
      undefined /* modifiers */,
      factory.createVariableDeclarationList(variableDecls, ts.NodeFlags.Const)
    ),
    factory
  );
}

// insert a new statement above the first non-import statement
function insertStatementAfterImports(
  sourceFile: ts.SourceFile,
  statement: ts.Statement,
  factory: ts.NodeFactory
): ts.SourceFile {
  const { statements } = sourceFile;

  const nonImportIdx = statements.findIndex((s) => !ts.isImportDeclaration(s));

  const newStatements =
    nonImportIdx === -1
      ? [statement, ...statements]
      : [...statements.slice(0, nonImportIdx), statement, ...statements.slice(nonImportIdx)];

  return factory.updateSourceFile(sourceFile, newStatements);
}
