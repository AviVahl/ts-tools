import ts from 'typescript';

const compilerOptions: ts.CompilerOptions = {
    target: ts.ScriptTarget.ES2017,
    jsx: ts.JsxEmit.Preserve
};

export function codeMatchers(chai: any, util: any) {
    chai.Assertion.addMethod('matchCode', function(this: any, expectedCode: string): void {
        const { flag, eql, inspect } = util;
        let actualCode = flag(this, 'object');

        if (typeof actualCode !== 'string') {
            throw new Error(`Actual code is not a string: ${inspect(actualCode)}`);
        } else if (typeof expectedCode !== 'string') {
            throw new Error(`Expected code is not a string: ${inspect(expectedCode)}`);
        }

        actualCode = normalizeCode(actualCode);
        expectedCode = ts.transpileModule(expectedCode, { compilerOptions }).outputText;
        expectedCode = normalizeCode(expectedCode);

        this.assert(
            eql(actualCode, expectedCode),
            `Expected code to match`,
            `Expected code to not match`,
            expectedCode,
            actualCode
        );
    });
}

function normalizeCode(code: string): string {
    return code.replace(/\r?\n/g, '\n').split('\n').map(l => l.trim()).join('\n').trim();
}
