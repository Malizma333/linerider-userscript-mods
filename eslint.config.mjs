import { defineConfig, globalIgnores } from "eslint/config";
import globals from "globals";
import js from "@eslint/js";
import stylisticJs from "@stylistic/eslint-plugin-js";

export default defineConfig([
  globalIgnores(["**/archived/"]),
  {
    files: ["**/*.js"],
    languageOptions: {
      globals: {
        ...globals.browser,
        Millions: "readonly",
        V2: "readonly",
        store: "readonly",
      }
    },
    plugins: { js, "@stylistic/js": stylisticJs },
    extends: ["js/recommended"],
    rules: {
      "@stylistic/js/semi": ["error", "always"],
      "@stylistic/js/indent": ["error", 2],
      "@stylistic/js/quotes": ["error", "double"],
      "@stylistic/js/linebreak-style": ["error", "unix"],
      "@stylistic/js/no-trailing-spaces": "error",
    },
  }
]);
