import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import tseslint from 'typescript-eslint'
import { defineConfig, globalIgnores } from 'eslint/config'

export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      js.configs.recommended,
      tseslint.configs.recommended,
      reactHooks.configs['recommended-latest'],
      reactRefresh.configs.vite,
    ],
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
    },
    rules: {
      'no-restricted-imports': [
        'error',
        {
          paths: [
            {
              name: '@heroicons/react/24/outline',
              message: 'Import icons from @da/ui/icons instead for consistency and version safety',
            },
            {
              name: '@heroicons/react/24/solid',
              message: 'Import icons from @da/ui/icons instead for consistency and version safety',
            },
            {
              name: '@heroicons/react/20/solid',
              message: 'Import icons from @da/ui/icons instead for consistency and version safety',
            },
          ],
        },
      ],
    },
  },
])
