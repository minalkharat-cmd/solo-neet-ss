import { defineConfig } from 'vitest/config';

export default defineConfig({
    test: {
        globals: true,
        environment: 'node',
        include: ['__tests__/**/*.test.ts'],
        coverage: {
            provider: 'v8',
            include: ['**/*.ts'],
            exclude: [
                'node_modules/**',
                'dist/**',
                '__tests__/**',
                'vitest.config.ts',
                'types.ts',
                'pvp/battleQuestions.ts',
            ],
        },
        testTimeout: 10000,
    },
});
