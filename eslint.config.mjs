// ESLint só do sistema do Foundry 14 (foundry-sistema/) e dos testes dele; a wiki não passa por aqui. Roda pelo npx,
// sem node_modules (o repositório fica no OneDrive):
//   npx --yes eslint@10.12.0 foundry-sistema tests/sistema tests/lib/foundry14.js tests/lib/trava.js tests/lib/c34-*.js tests/cenarios/v14.js
// As regras vão escritas aqui, sem importar pacote: as do "recommended" que pegam erro de verdade.
const regras = {
  'no-undef': 'error',
  'no-unused-vars': ['error', { args: 'none', caughtErrors: 'none' }],
  'no-unused-private-class-members': 'error',
  'no-unreachable': 'error',
  'no-dupe-keys': 'error',
  'no-dupe-args': 'error',
  'no-dupe-else-if': 'error',
  'no-duplicate-case': 'error',
  'no-redeclare': 'error',
  'no-const-assign': 'error',
  'no-func-assign': 'error',
  'no-import-assign': 'error',
  'no-self-assign': 'error',
  'no-cond-assign': 'error',
  'no-constant-condition': 'error',
  'no-fallthrough': 'error',
  'no-empty': ['error', { allowEmptyCatch: true }],
  'no-unsafe-finally': 'error',
  'no-unsafe-negation': 'error',
  'no-useless-catch': 'error',
  'no-loss-of-precision': 'error',
  'no-sparse-arrays': 'error',
  'use-isnan': 'error',
  'valid-typeof': 'error'
};

const somenteLeitura = nomes => Object.fromEntries(nomes.map(nome => [nome, 'readonly']));
const navegador = somenteLeitura(['window', 'document', 'console', 'fetch', 'setTimeout', 'clearTimeout', 'setInterval', 'clearInterval', 'Event', 'HTMLElement', 'File', 'structuredClone', 'location', 'localStorage', 'performance']);
const foundry = somenteLeitura(['foundry', 'game', 'CONFIG', 'CONST', 'Hooks', 'ui', 'canvas', 'Actor', 'Item', 'ChatMessage', 'Roll', 'Scene', 'Combat', 'Combatant', 'User', 'Token', 'TokenDocument', 'ActiveEffect', 'fromUuid', 'fromUuidSync', 'Handlebars', '_del', 'PIXI']);
const node = somenteLeitura(['process', 'Buffer', 'require', 'module', '__dirname', '__filename', 'console', 'URL', 'setTimeout', 'clearTimeout', 'fetch', 'structuredClone', 'AbortSignal', 'WebSocket']);

export default [
  { ignores: ['foundry-sistema/packs/**', 'foundry-sistema/.cache/**'] },
  { linterOptions: { reportUnusedDisableDirectives: 'error' } },
  {
    // O código que roda no Foundry (navegador).
    files: ['foundry-sistema/scripts/**/*.mjs'],
    languageOptions: { ecmaVersion: 'latest', sourceType: 'module', globals: { ...navegador, ...foundry } },
    rules: regras
  },
  {
    // Build, instalador, ferramentas da migração e testes de referência (Node, módulos).
    files: ['foundry-sistema/build/**/*.mjs', 'foundry-sistema/migracao/**/*.mjs', 'foundry-sistema/instalar.mjs', 'tests/sistema/**/*.mjs'],
    languageOptions: { ecmaVersion: 'latest', sourceType: 'module', globals: node },
    rules: regras
  },
  {
    // O harness e o cenário do Foundry 14 e a trava dos testes (Node, CommonJS, como o resto de tests/).
    files: ['tests/lib/foundry14.js', 'tests/lib/trava.js', 'tests/lib/c34-*.js', 'tests/cenarios/v14.js'],
    languageOptions: { ecmaVersion: 'latest', sourceType: 'commonjs', globals: node },
    rules: regras
  }
];
