import js from "@eslint/js";
import globals from "globals";
import { defineConfig } from 'eslint/config';
import tseslint from "typescript-eslint";
import pluginReact from "eslint-plugin-react";
import reactHooks from "eslint-plugin-react-hooks";
import reactRefresh from "eslint-plugin-react-refresh";
import pluginVue from "eslint-plugin-vue";
import vueParser from "vue-eslint-parser";

// ESLint configuration for the project.
export default defineConfig([
	{ 
		ignores: ["**/dist/", "**/build/", "node_modules", "**/*.d.ts"] 
	},
	js.configs.recommended,
	...tseslint.configs.recommended,
	pluginReact.configs.flat.recommended,
	reactHooks.configs.flat.recommended,
	reactRefresh.configs.vite,
  	...pluginVue.configs["flat/recommended"],
	{
		files: ["**/*.js"],
		languageOptions: {
			globals: {
				...globals.browser,
				...globals.node,
			}
		}
	},
	{
		files: ["**/*.{ts,tsx,vue,js,cjs}"],
		languageOptions: {
      		ecmaVersion: "latest",
      		parser: vueParser,
			parserOptions: {
        		parser: tseslint.parser,
				project: "./tsconfig.eslint.json",
				tsconfigRootDir: import.meta.dirname,
        		extraFileExtensions: [".vue"],
			},
			globals: {
				...globals.browser,
				...globals.node,
			},
		},
		settings: {
			react: {
				version: "detect",
			},
		},
		rules: {
			"prefer-const": "off",
			// Indentation (tabs)
      		indent: ["error", "tab"],
			"vue/html-indent": ["error", "tab" ],
			"vue/script-indent": ["error", "tab" ],
			// TypeScript
			"@typescript-eslint/no-explicit-any": "warn",
			"no-unused-vars": "off",
			"@typescript-eslint/no-unused-vars": "warn",
			// React
			"react/react-in-jsx-scope": "off",
			// Vue
			"vue/max-attributes-per-line": ["error", {
				"singleline": { "max": 3 },      
				"multiline": { "max": 1 }
			}]
		},
	}
]);