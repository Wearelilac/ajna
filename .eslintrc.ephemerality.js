/**
 * M5.1: ESLint Rule - No Audio Persistence
 * Enforces ephemerality at lint time
 */

module.exports = {
  rules: {
    'no-restricted-syntax': [
      'error',
      {
        selector: 'CallExpression[callee.object.name=/fs|FileSystem/][callee.property.name=/write|append|create/]',
        message: '🚫 Audio persistence is forbidden. Use EdgeBuffer (ephemeral ring buffer) only.',
      },
      {
        selector: 'CallExpression[callee.name=/writeFile|appendFile|createWriteStream/]',
        message: '🚫 File writes are forbidden in edge module. Audio must remain ephemeral.',
      },
      {
        selector: 'CallExpression[callee.name="fetch"][arguments.0.value=/upload|audio/]',
        message: '🚫 Audio upload is forbidden. Only 7-field flags allowed (NO audio payload).',
      },
      {
        selector: 'ImportDeclaration[source.value="react-native-fs"]',
        message: '🚫 react-native-fs is forbidden in edge module. Use EdgeBuffer only.',
      },
      {
        selector: 'ImportDeclaration[source.value="@react-native-async-storage/async-storage"]',
        message: '🚫 AsyncStorage is forbidden in edge module for audio. Use EdgeBuffer only.',
      },
    ],
  },
  overrides: [
    {
      files: ['apps/mobile/src/edge/**/*.ts'],
      rules: {
        'no-restricted-syntax': [
          'error',
          {
            selector: 'ImportDeclaration[source.value=/fs|storage|upload/]',
            message: '🚫 Edge module MUST be isolated. No network, FS, or storage imports allowed.',
          },
        ],
      },
    },
  ],
};
