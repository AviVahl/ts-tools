declare namespace Chai {
  export interface Assertion {
    matchCode(code: string): Assertion;
  }
}
