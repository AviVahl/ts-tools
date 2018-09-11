import { expect } from 'chai'

export function validateCode(actualCode: string, expectedCode: string): void {
    const normalizedActual = normalizeCode(actualCode)
    const normalizedExpected = normalizeCode(expectedCode)
    expect(normalizedActual).to.equal(normalizedExpected)
}

function normalizeCode(code: string): string {
    return code.replace(/\r?\n/g, '\n').split('\n').map(l => l.trim()).join('\n').trim()
}
