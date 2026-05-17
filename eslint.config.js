import js from "@eslint/js";
import tseslint from "typescript-eslint";
import react from "eslint-plugin-react";
import reactHooks from "eslint-plugin-react-hooks";
import globals from "globals";

export default [
    js.configs.recommended,
    ...tseslint.configs.recommended,
    {
        files: ["**/*.{ts,tsx,js,jsx}"],
        ...react.configs.flat.recommended,
        languageOptions: {
            ...react.configs.flat.recommended.languageOptions,
            globals: { ...globals.browser },
        },
    },
    {
        files: ["**/*.{ts,tsx,js,jsx}"],
        ...react.configs.flat["jsx-runtime"],
    },
    {
        files: ["**/*.{ts,tsx,js,jsx}"],
        plugins: { "react-hooks": reactHooks },
        rules: {
            "react-hooks/rules-of-hooks": "error",
            "react-hooks/exhaustive-deps": "error",
            "react/display-name": "off",
            "react/prop-types": "off",
            "@typescript-eslint/no-unused-vars": "warn",
        },
    },
];
