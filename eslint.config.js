// For more info, see https://github.com/storybookjs/eslint-plugin-storybook#configuration-flat-config-format
import storybook from "eslint-plugin-storybook";

import globals from "globals";
import pluginJs from "@eslint/js";
import pluginReact from "eslint-plugin-react";
import pluginReactHooks from "eslint-plugin-react-hooks";
import pluginUnusedImports from "eslint-plugin-unused-imports";
import tseslint from "typescript-eslint";

export default [{
  ignores: [
    // This repo contains an intentionally-ignored nested copy at `hotmess-globe/`.
    // Do not lint it (it has different config/tooling and breaks CI).
    "hotmess-globe/**",
    // Storybook config and stories - handled by Storybook's own tooling
    ".storybook/**",
    "**/*.stories.ts",
    "**/*.stories.tsx",
    "**/*.stories.js",
    "**/*.stories.jsx",
    "**/stories/**",
  ],
}, {
  files: [
    "src/components/**/*.{js,mjs,cjs,jsx}",
    "src/pages/**/*.{js,mjs,cjs,jsx}",
    "src/Layout.jsx",
  ],
  ignores: [
    "src/lib/**/*",
    "src/components/ui/**/*",
    "src/components/docs/**/*",
    "src/components/utils/supabase-schema.sql.jsx",
  ],
  ...pluginJs.configs.recommended,
  ...pluginReact.configs.flat.recommended,
  languageOptions: {
    globals: globals.browser,
    parserOptions: {
      ecmaVersion: 2022,
      sourceType: "module",
      ecmaFeatures: {
        jsx: true,
      },
    },
  },
  settings: {
    react: {
      version: "detect",
    },
  },
  plugins: {
    react: pluginReact,
    "react-hooks": pluginReactHooks,
    "unused-imports": pluginUnusedImports,
  },
  rules: {
    "no-unused-vars": "off",
    "react/jsx-uses-vars": "error",
    "react/jsx-uses-react": "error",
    "unused-imports/no-unused-imports": "error",
    "unused-imports/no-unused-vars": [
      "warn",
      {
        vars: "all",
        varsIgnorePattern: "^_",
        args: "after-used",
        argsIgnorePattern: "^_",
      },
    ],
    "react/prop-types": "off",
    "react/react-in-jsx-scope": "off",
    "react/no-unknown-property": [
      "error",
      { ignore: ["cmdk-input-wrapper", "toast-close", "jsx"] },
    ],
    "react-hooks/rules-of-hooks": "error",
  },
}, ...storybook.configs["flat/recommended"]];
