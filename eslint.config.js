import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import { importX } from 'eslint-plugin-import-x'
import security from 'eslint-plugin-security'
import { defineConfig, globalIgnores } from 'eslint/config'

export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{js,jsx}'],
    extends: [
      js.configs.recommended,
      reactHooks.configs.flat.recommended,
      reactRefresh.configs.vite,
      security.configs.recommended,
    ],
    rules: {
      'react-hooks/set-state-in-effect': 'warn',
      // Disattiva solo il falso positivo rumoroso su accessi dinamici a dizionari/array in JS
      'security/detect-object-injection': 'off',
    },
    languageOptions: {
      globals: globals.browser,
      parserOptions: { ecmaFeatures: { jsx: true } },
    },
  },
  // Dipendenze circolari e confini architetturali MVVM solo sul codice sorgente applicativo
  {
    files: ['src/**/*.{js,jsx}'],
    plugins: {
      'import-x': importX,
    },
    settings: {
      'import-x/resolver': {
        node: {
          extensions: ['.js', '.jsx', '.mjs'],
        },
      },
    },
    rules: {
      // Rileva dipendenze circolari tra moduli e layer MVVM
      'import-x/no-cycle': ['error', { maxDepth: 6, ignoreExternal: true }],
      // Confini architetturali MVVM: View -> ViewModel -> Repository -> DataSource (Backend/Storage)
      'import-x/no-restricted-paths': [
        'error',
        {
          zones: [
            // 1. View & UI Contexts non possono importare Data Layer, Backend, Storage, Service o mock statici
            {
              target: ['./src/pages', './src/components', './src/contexts'],
              from: './src/backend',
              message: 'MVVM violation: View/Context must not import Backend/DataSource directly; use a ViewModel.',
            },
            {
              target: ['./src/pages', './src/components', './src/contexts'],
              from: './src/repository',
              message: 'MVVM violation: View/Context must not import Repository directly; use a ViewModel.',
            },
            {
              target: ['./src/pages', './src/components', './src/contexts'],
              from: ['./src/storage', './src/service', './src/api'],
              message: 'MVVM violation: View/Context must not import Storage, ApiService or raw API clients directly.',
            },
            {
              target: ['./src/pages', './src/components', './src/contexts'],
              from: './src/data',
              message: 'MVVM violation: View/Context must not bypass ViewModel by importing static data/mocks directly.',
            },
            // 2. ViewModel non conosce la View né i DataSource concreti (accede ai dati solo via Repository)
            {
              target: './src/viewmodel',
              from: ['./src/pages', './src/components', './src/contexts'],
              message: 'MVVM violation: ViewModel must not depend on View or React Context.',
            },
            {
              target: './src/viewmodel',
              from: ['./src/backend', './src/storage', './src/service', './src/api', './src/data'],
              message: 'MVVM violation: ViewModel must access data only through a Repository.',
            },
            // 3. Repository non conosce ViewModel né UI
            {
              target: './src/repository',
              from: ['./src/viewmodel', './src/pages', './src/components', './src/contexts', './src/api'],
              message: 'MVVM violation: Repository must not depend on ViewModel or UI layers.',
            },
            // 4. DataSource / Backend / Storage / Service non importano mai Repository, ViewModel o UI
            {
              target: ['./src/backend', './src/storage', './src/service', './src/api'],
              from: ['./src/repository', './src/viewmodel', './src/pages', './src/components', './src/contexts'],
              message: 'MVVM violation: DataSource/Backend/Storage must not import Repository, ViewModel or UI (inverted dependency).',
            },
            // 5. Domain Models restano puri (nessuna dipendenza verso layer esterni)
            {
              target: './src/models',
              from: [
                './src/pages',
                './src/components',
                './src/contexts',
                './src/viewmodel',
                './src/repository',
                './src/backend',
                './src/storage',
                './src/service',
                './src/api',
                './src/data',
              ],
              message: 'MVVM violation: Domain Models must stay independent from Data, ViewModel and UI layers.',
            },
            // 6. Utils non devono bypassare Repository importando direttamente Backend/Storage/Service
            {
              target: './src/utils',
              from: ['./src/backend', './src/repository', './src/storage', './src/service', './src/api'],
              message: 'MVVM violation: Utility/hook in src/utils must not access Backend/Repository/Storage directly.',
            },
          ],
        },
      ],
    },
  },
  // View & UI Contexts: vietato importare SDK Firebase o chiamare fetch direttamente
  {
    files: ['src/pages/**/*.{js,jsx}', 'src/components/**/*.{js,jsx}', 'src/contexts/**/*.{js,jsx}'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['firebase', 'firebase/*'],
              message: 'MVVM violation: View/Context must not import Firebase SDK directly; isolate it in Backend/DataSource.',
            },
          ],
        },
      ],
      'no-restricted-globals': [
        'error',
        {
          name: 'fetch',
          message: 'MVVM violation: View/Context must not call fetch directly; delegate to ViewModel -> Repository.',
        },
      ],
    },
  },
  // Classi ViewModel pure (escluso l'adapter React useViewModel.js): niente React, Firebase o side-effect DOM
  {
    files: ['src/viewmodel/**/*.js'],
    ignores: ['src/viewmodel/useViewModel.js'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          paths: [
            { name: 'react', message: 'MVVM violation: pure ViewModel class must stay framework-agnostic (no React import).' },
            { name: 'react-dom', message: 'MVVM violation: pure ViewModel class must not import react-dom.' },
            { name: 'react-router-dom', message: 'MVVM violation: pure ViewModel class must not import react-router-dom.' },
          ],
          patterns: [
            { group: ['firebase', 'firebase/*'], message: 'MVVM violation: ViewModel must not import Firebase SDK directly.' },
          ],
        },
      ],
      'no-restricted-globals': [
        'error',
        { name: 'document', message: 'MVVM violation: ViewModel must not touch DOM (document).' },
        { name: 'window', message: 'MVVM violation: ViewModel must not touch browser UI globals (window).' },
        { name: 'Image', message: 'MVVM violation: ViewModel must not perform DOM image preloading (new Image()).' },
        { name: 'fetch', message: 'MVVM violation: ViewModel must not call fetch directly; use Repository.' },
        { name: 'localStorage', message: 'MVVM violation: ViewModel must not access localStorage directly; use Repository.' },
        { name: 'alert', message: 'MVVM violation: ViewModel must not trigger browser dialogs (alert).' },
        { name: 'confirm', message: 'MVVM violation: ViewModel must not trigger browser dialogs (confirm).' },
      ],
    },
  },
  // Repository, DataSource e Models: nessun import di React o Router
  {
    files: ['src/repository/**/*.js', 'src/backend/**/*.js', 'src/storage/**/*.js', 'src/service/**/*.js', 'src/models/**/*.js'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          paths: [
            { name: 'react', message: 'MVVM violation: Data/Domain layer must not import React.' },
            { name: 'react-dom', message: 'MVVM violation: Data/Domain layer must not import react-dom.' },
            { name: 'react-router-dom', message: 'MVVM violation: Data/Domain layer must not import react-router-dom.' },
          ],
        },
      ],
    },
  },
  // Script di test Node: disattiva regole browser/MVVM
  {
    files: ['**/*.mjs'],
    extends: [js.configs.recommended],
    languageOptions: { globals: globals.node },
  },
])
