/**
 * electron-builder configuration for FrotaGestor Pro
 * Generates NSIS Windows Installer (.exe)
 */
module.exports = {
  appId: 'com.sartinfo.frotagestor',
  productName: 'FrotaGestor Pro',
  copyright: 'Copyright © 2026 SARTINFO',

  directories: {
    output: 'installer-output',
    buildResources: 'build',
  },

  files: [
    'dist/**/*',
    'electron/**/*',
    'package.json',
  ],

  // Do not install production node_modules — Vite bundles everything into dist/
  npmRebuild: false,

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

  // Portable version as extra target (optional — uncomment to also generate .exe portable)
  // extraTargets: ['portable'],
};
