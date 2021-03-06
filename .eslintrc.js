module.exports = {
    root: true,
    parser: "vue-eslint-parser",
    parserOptions: {
        parser: "@typescript-eslint/parser",
        sourceType: "module"
    },

    env: {
        browser: true,
        node: true
    },
    extends: [
        "plugin:@typescript-eslint/recommended",
        "plugin:vue/recommended",
        "standard"
    ],
    globals: {
        __static: true
    },
    rules: {
    // allow paren-less arrow functions
        "arrow-parens": 0,
        // allow async-await
        "generator-star-spacing": 0,
        // allow debugger during development
        "no-debugger": process.env.NODE_ENV === "production" ? 2 : 0,
        "vue/component-name-in-template-casing": ["warn", "PascalCase", {
            ignores: ["i18n"]
        }],
        "@typescript-eslint/ban-ts-comment": 0,
        "@typescript-eslint/camelcase": 0,
        "@typescript-eslint/explicit-function-return-type": 0,
        "@typescript-eslint/no-empty-function": 0,
        "@typescript-eslint/no-var-requires": 0,
        indent: [2, 4],
        quotes: [1, "double", { avoidEscape: true }],
        semi: [2, "always"]
    }
};
