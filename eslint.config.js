import js from "@eslint/js";
import globals from "globals";
import reactHooks from "eslint-plugin-react-hooks";
import reactRefresh from "eslint-plugin-react-refresh";

export default [
  { ignores: ["dist/**", ".vercel/**", "node_modules/**"] },

  js.configs.recommended,

  // Browser app source (React SPA runs in the browser).
  {
    files: ["**/*.{js,jsx}"],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: "module",
      globals: globals.browser,
      parserOptions: { ecmaFeatures: { jsx: true } },
    },
  },

  // React component files: enforce the rules of hooks; nudge on deps and Fast Refresh.
  // Note: react-hooks v7's `recommended-latest` also bundles the experimental React
  // Compiler rules; this codebase isn't written for the Compiler, so we opt into the
  // long-stable pair instead of adopting those as hard errors.
  {
    files: ["**/*.jsx"],
    plugins: { "react-hooks": reactHooks, "react-refresh": reactRefresh },
    rules: {
      "react-hooks/rules-of-hooks": "error",
      "react-hooks/exhaustive-deps": "warn",
      ...reactRefresh.configs.vite.rules,
    },
  },

  // Node contexts: build scripts, serverless API routes, hooks, tooling, and tests.
  {
    files: [
      "scripts/**",
      "api/**",
      "hooks/**",
      "**/*.mjs",
      "**/*.test.{js,mjs}",
      "*.config.js",
      "eslint.config.js",
    ],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: "module",
      globals: globals.node,
    },
  },

  // Unused-vars policy for every file: allow intentional throwaways
  // (UPPER_CASE/underscore-prefixed, unused args, rest-sibling omits).
  {
    rules: {
      "no-unused-vars": [
        "error",
        {
          varsIgnorePattern: "^[A-Z_]",
          argsIgnorePattern: "^_",
          caughtErrorsIgnorePattern: "^_",
          ignoreRestSiblings: true,
        },
      ],
    },
  },
];
