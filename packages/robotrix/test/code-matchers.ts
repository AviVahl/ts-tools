import prettier from 'prettier';

export const codeMatchers: Chai.ChaiPlugin = (chai, util) => {
    chai.Assertion.addMethod('matchCode', function(expectedCode: string): void {
        const { flag, inspect } = util;
        let actualCode: string = flag(this, 'object');

        if (typeof actualCode !== 'string') {
            throw new Error(`Actual code is not a string: ${inspect(actualCode)}`);
        } else if (typeof expectedCode !== 'string') {
            throw new Error(`Expected code is not a string: ${inspect(expectedCode)}`);
        }

        actualCode = prettier.format(actualCode, { parser: 'typescript' });
        expectedCode = prettier.format(expectedCode, { parser: 'typescript' });

        this.assert(
            actualCode === expectedCode,
            `Expected code to match`,
            `Expected code to not match`,
            expectedCode,
            actualCode
        );
    });
};
