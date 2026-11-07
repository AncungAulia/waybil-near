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
  prettier,
);
