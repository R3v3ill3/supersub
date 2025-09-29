module.exports = {
  extends: ['@antfu/eslint-config'],
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
};


