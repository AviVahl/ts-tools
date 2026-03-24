import { equal } from 'node:assert/strict';
import prettier from 'prettier';

const prettierOptions = { parser: 'typescript', endOfLine: 'lf' } as const;
const useStrictClause = '"use strict";';

export async function codeEqual(actualCode: string, expectedCode: string) {
  actualCode = actualCode.startsWith(useStrictClause) ? actualCode.slice(useStrictClause.length) : actualCode;
  actualCode = await prettier.format(actualCode, prettierOptions);
  expectedCode = await prettier.format(expectedCode, prettierOptions);
  equal(actualCode, expectedCode);
}
