/**
 * electron-builder configuration for FrotaGestor Pro
 * Generates NSIS Windows Installer (.exe) with auto-update via GitHub Releases
 */
module.exports = {
  appId: 'com.sartinfo.frotagestor',
  productName: 'FrotaGestor Pro',
  copyright: 'Copyright © 2026 FrotaGestor Pro. Infraestrutura produzido por Ananias Feliciano',

  directories: {
    output: 'installer-output',
    buildResources: 'build',
  },

  files: [
    'dist/**/*',
    'electron/**/*',
    'node_modules/electron-updater/**/*',
    'node_modules/lazy-val/**/*',
    'node_modules/semver/**/*',
    'node_modules/lodash.isequal/**/*',
    'node_modules/js-yaml/**/*',
    'node_modules/argparse/**/*',
    'node_modules/tiny-typed-emitter/**/*',
    'node_modules/sax/**/*',
    'package.json',
  ],

  npmRebuild: false,

  // ── Publicação no GitHub Releases (auto-update) ──────────
  publish: [
    {
      provider: 'github',
      owner: 'Ananiasfeliciano',
      repo: 'FrotaGestor-Pro',
      releaseType: 'release',
    },
  ],

  win: {
    target: [
      {
        target: 'nsis',
        arch: ['x64'],
      },
    ],
    icon: 'build/icon.ico',
    artifactName: 'FrotaGestor-Pro-Setup-${version}.${ext}',
    signAndEditExecutable: false,
    sign: null,
  },

  nsis: {
    oneClick: false,
    allowToChangeInstallationDirectory: true,
    perMachine: false,
    createDesktopShortcut: true,
    createStartMenuShortcut: true,
    shortcutName: 'FrotaGestor Pro',
    installerIcon: 'build/icon.ico',
    uninstallerIcon: 'build/icon.ico',
    installerHeaderIcon: 'build/icon.ico',
    deleteAppDataOnUninstall: false,
    menuCategory: 'SARTINFO',
    license: undefined,
  },

  asar: true,
};
