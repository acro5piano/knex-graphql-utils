export default {
  extensions: ['ts'],
  require: ['esbuild-register', './tests/globalHooks.ts'],
  files: ['tests/**/*.test.ts'],
}
