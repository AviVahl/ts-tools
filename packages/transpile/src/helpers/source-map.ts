const inlineSourceMapPrefix = '//# sourceMappingURL=data:application/json;base64,';
const inlineSourceMapPrefixLength = inlineSourceMapPrefix.length;

export const decodeBase64 = (data: string) => Buffer.from(data, 'base64').toString();

export function extractInlineSourceMap(code: string): string | undefined {
    const inlineSourceMapIdx = code.lastIndexOf(inlineSourceMapPrefix);
    return inlineSourceMapIdx !== -1
        ? decodeBase64(code.slice(inlineSourceMapIdx + inlineSourceMapPrefixLength).trimRight())
        : undefined;
}
