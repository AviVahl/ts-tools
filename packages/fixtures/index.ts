import { join } from 'path';

export const fixturesRoot = __dirname;

export const noTsconfigFixture = join(fixturesRoot, 'no-tsconfig');
export const defaultTsconfigFixture = join(fixturesRoot, 'default-tsconfig');
export const customTsconfigFixture = join(fixturesRoot, 'custom-tsconfig');
