import { equal } from 'node:assert/strict';
import prettier from 'prettier';

const prettierOptions = { parser: 'typescript', endOfLine: 'lf' } as const;

export function codeEqual(actualCode: string, expectedCode: string) {
  actualCode = prettier.format(actualCode, prettierOptions);
  expectedCode = prettier.format(expectedCode, prettierOptions);
  equal(actualCode, expectedCode);
}
