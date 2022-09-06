module.exports = {
    env: {
        browser: true,
        es2021: true,
        node: true,
    },
    extends: ['airbnb-base', 'plugin:prettier/recommended'],
    parser: '@typescript-eslint/parser',
    parserOptions: {
        ecmaVersion: 'latest',
        sourceType: 'module',
    },
    settings: {
        'import/resolver': {
            typescript: {},
        },
    },
    plugins: ['@typescript-eslint'],
    rules: {
        indent: [
            2,
            4,
            {
                SwitchCase: 1,
            },
        ],
        'import/prefer-default-export': 1,
        'import/extensions': [
            // 这个是解决不写后缀报错的问题
            'error',
            'ignorePackages',
            {
                js: 'never',
                jsx: 'never',
                ts: 'never',
                tsx: 'never',
                json: 'never',
            },
        ],
        'no-unused-expressions': 1,
        'no-shadow': 'off',
        '@typescript-eslint/no-shadow': ['error'],
        'no-unused-vars': 1,
        'no-plusplus': 1,
        'no-underscore-dangle': 'off',
    },
};
