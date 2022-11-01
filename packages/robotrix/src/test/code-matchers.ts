import prettier from 'prettier';

export const codeMatchers: Chai.ChaiPlugin = (chai, { flag }) => {
  chai.Assertion.addMethod('matchCode', function (expectedCode: string): void {
    let actualCode = flag(this, 'object') as string;

    if (typeof actualCode !== 'string') {
      throw new Error(`Actual code is not a string: ${String(actualCode)}`);
    } else if (typeof expectedCode !== 'string') {
      throw new Error(`Expected code is not a string: ${String(expectedCode)}`);
    }

    actualCode = prettier.format(actualCode, { parser: 'typescript', endOfLine: 'lf' });
    expectedCode = prettier.format(expectedCode, { parser: 'typescript', endOfLine: 'lf' });

    this.assert(
      actualCode === expectedCode,
      `Expected code to match`,
      `Expected code to not match`,
      expectedCode,
      actualCode
    );
  });
};
