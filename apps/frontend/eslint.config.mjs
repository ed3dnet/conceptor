import path from "node:path";
import { fileURLToPath } from "node:url";

import { includeIgnoreFile } from "@eslint/compat";
import stylistic from "@stylistic/eslint-plugin";
import svelte from "eslint-plugin-svelte";
import globals from "globals";
import * as tseslint from "typescript-eslint";

import { legacyPlugin, PROJECT_RULES } from "../../eslint.config.mjs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const gitignorePath = fileURLToPath(new URL("./.gitignore", import.meta.url));

// import prettier from 'eslint-config-prettier';
// import js from '@eslint/js';
// import { includeIgnoreFile } from '@eslint/compat';
// import svelte from 'eslint-plugin-svelte';
// import globals from 'globals';
// import { fileURLToPath } from 'node:url';
// import ts from 'typescript-eslint';
// const gitignorePath = fileURLToPath(new URL('./.gitignore', import.meta.url));

// export default ts.config(
// 	includeIgnoreFile(gitignorePath),
// 	js.configs.recommended,
// 	...ts.configs.recommended,
// 	...svelte.configs['flat/recommended'],
// 	prettier,
// 	...svelte.configs['flat/prettier'],
// 	{
// 		languageOptions: {
// 			globals: {
// 				...globals.browser,
// 				...globals.node
// 			}
// 		}
// 	},
// 	{
// 		files: ['**/*.svelte'],

// 		languageOptions: {
// 			parserOptions: {
// 				parser: ts.parser
// 			}
// 		}
// 	}
// );


export default tseslint.config(
  includeIgnoreFile(gitignorePath),
  {
    extends: [
      ...tseslint.configs.recommended,
      ...svelte.configs["flat/recommended"],
    ],
    ignores: ["**/dist/**/*", "**/.svelte-kit/**/*"],
  },
  {
    plugins: {
      "@typescript-eslint": tseslint.plugin,
      "@stylistic": stylistic,
      import: legacyPlugin("eslint-plugin-import", "import"),
      svelte: svelte,
    },
    languageOptions: {
      globals: {
        ...globals.browser,
        ...globals.node,
      },
    },
    rules: {
      ...PROJECT_RULES,
    },
  },
  {
    files: ["**/src/*.ts", "**/src/*.tsx"],
    extends: [
      ...tseslint.configs.recommendedTypeChecked,
      ...tseslint.configs.stylisticTypeChecked,
    ],
    languageOptions: {
      parserOptions: {
        project: "./tsconfig.json",
        tsconfigRootDir: __dirname,
      },
    },
  },
  {
    files: ["**/*.svelte"],
    languageOptions: {
      parser: svelte.parser,
      parserOptions: {
        parser: tseslint.parser,
      },
    },
  }
);
