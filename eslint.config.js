// ESLint for every TypeScript package in the workspace.
// fe and be can add their own rules (Next.js, Node) in their own config later.
import js from "@eslint/js";
import tseslint from "typescript-eslint";
import prettier from "eslint-config-prettier";

export default tseslint.config(
  {
    ignores: [
      "**/node_modules/**",
      "**/dist/**",
      "**/.next/**",
      "**/out/**",
      "contracts/**",
      "design/**",
      "**/target/**",
      ".claude/**",
    ],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    // Review helpers are pasted into the browser console, so they talk to the page.
    files: ["fe/review/**/*.js"],
    languageOptions: {
      globals: {
        window: "readonly",
        document: "readonly",
        fetch: "readonly",
        console: "readonly",
        setTimeout: "readonly",
      },
    },
  },
  prettier,
);
