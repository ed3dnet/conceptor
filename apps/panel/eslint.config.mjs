import path from "node:path";
import { fileURLToPath } from "node:url";

import { fixupPluginRules } from "@eslint/compat";
import { FlatCompat } from "@eslint/eslintrc";
import js from "@eslint/js";
import stylistic from "@stylistic/eslint-plugin";
import typescriptEslint from "@typescript-eslint/eslint-plugin";
import tsParser from "@typescript-eslint/parser";
import prettier from "eslint-plugin-prettier/recommended";
import globals from "globals";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const compat = new FlatCompat({
  baseDirectory: __dirname,
  recommendedConfig: js.configs.recommended,
  allConfig: js.configs.all,
});

export function legacyPlugin(name, alias = name) {
  const plugin = compat.plugins(name)[0]?.plugins?.[alias];

  if (!plugin) {
    throw new Error(`Unable to resolve plugin ${name} and/or alias ${alias}`);
  }

  return fixupPluginRules(plugin);
}

export const importPlugin = legacyPlugin("eslint-plugin-import", "import");
export const reactHooksPlugin = legacyPlugin(
  "eslint-plugin-react-hooks",
  "react-hooks",
);
export const reactRefreshPlugin = legacyPlugin(
  "eslint-plugin-react-refresh",
  "react-refresh",
);

export const PROJECT_RULES = {
  quotes: [
    2,
    "double",
    {
      avoidEscape: true,
      allowTemplateLiterals: true,
    },
  ],

  "@typescript-eslint/no-unused-vars": "off",
  "@typescript-eslint/consistent-type-imports": [
    "error",
    {
      fixStyle: "inline-type-imports",
    },
  ],

  "import/order": [
    "error",
    {
      groups: ["builtin", "external", "internal", "parent", "sibling", "index"],
      "newlines-between": "always",
      alphabetize: { order: "asc" },
    },
  ],
  "import/first": "error",

  // React-specific rules
  ...reactHooksPlugin.configs.recommended.rules,
  "react-refresh/only-export-components": [
    "warn",
    { allowConstantExport: true },
  ],

  "no-restricted-globals": [
    "error",
    {
      name: "fetch",
      message: "Use fetch from the context provider instead.",
    },
    {
      name: "console",
      message: "Use the logger from the context provider instead.",
    },
  ],

  semi: ["error", "always"],
};

export default [
  ...compat.extends(
    "eslint:recommended",
    "plugin:@typescript-eslint/recommended",
  ),
  {
    // eslint v9 requires this to be in a separate config option for ??reasons??
    ignores: ["**/dist/**/*"],
  },
  {
    ...prettier,
    rules: {
      ...prettier.rules,
    },
  },
  {
    plugins: {
      "@typescript-eslint": typescriptEslint,
      import: importPlugin,
      "@stylistic": stylistic,
      "react-hooks": reactHooksPlugin,
      "react-refresh": reactRefreshPlugin,
    },

    languageOptions: {
      globals: {
        ...globals.node,
        ...globals.browser, // Added browser globals for React
      },

      parser: tsParser,
      ecmaVersion: 12,
      sourceType: "module",
      parserOptions: {
        ecmaFeatures: {
          jsx: true, // Enable JSX parsing
        },
      },
    },

    rules: {
      ...PROJECT_RULES,
    },
  },
  // Add specific configuration for TypeScript/React files
  {
    files: ["**/*.{ts,tsx}"],
    languageOptions: {
      globals: globals.browser,
    },
    rules: {
      ...PROJECT_RULES,
    },
  },
];
