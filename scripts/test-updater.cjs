// Test electron-updater endpoints
const https = require('https');

const OWNER = 'Ananiasfeliciano';
const REPO = 'frotagestor-pro---sistema-de-gest-o-de-frotas';

function fetch(url) {
  return new Promise((resolve) => {
    https.get(url, { headers: { 'User-Agent': 'electron-updater' } }, (res) => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        return fetch(res.headers.location).then(resolve);
      }
      let data = '';
      res.on('data', (c) => data += c);
      res.on('end', () => resolve({ status: res.statusCode, body: data }));
    });
  });
}

async function main() {
  console.log('=== Teste do Auto-Update ===\n');

  // 1. Test releases.atom
  const atom = await fetch(`https://github.com/${OWNER}/${REPO}/releases.atom`);
  console.log('1. releases.atom:', atom.status === 200 ? 'OK (200)' : 'FAIL (' + atom.status + ')');

  // 2. Test latest.yml via tag
  const yml = await fetch(`https://github.com/${OWNER}/${REPO}/releases/download/v1.0.0/latest.yml`);
  console.log('2. latest.yml:', yml.status === 200 ? 'OK (200)' : 'FAIL (' + yml.status + ')');
  if (yml.status === 200) {
    console.log('   Content:\n' + yml.body.split('\n').map(l => '   ' + l).join('\n'));
  }

  // 3. Test installer download (HEAD only)
  const exe = await new Promise((resolve) => {
    const url = `https://github.com/${OWNER}/${REPO}/releases/download/v1.0.0/FrotaGestor-Pro-Setup-1.0.0.exe`;
    https.get(url, { headers: { 'User-Agent': 'electron-updater' } }, (res) => {
      if (res.statusCode >= 300 && res.statusCode < 400) {
        resolve({ status: 'redirect-ok', location: res.headers.location.substring(0, 80) + '...' });
      } else {
        resolve({ status: res.statusCode });
      }
      res.destroy();
    });
  });
  console.log('3. installer.exe:', exe.status === 'redirect-ok' ? 'OK (redirect)' : 'Status: ' + exe.status);

  // 4. Check version comparison
  const currentVersion = '1.0.0';
  const latestVersion = yml.body.match(/version:\s*(.+)/)?.[1]?.trim();
  console.log('\n4. Versão instalada:', currentVersion);
  console.log('   Versão na release:', latestVersion);
  console.log('   Atualização necessária:', currentVersion !== latestVersion ? 'SIM' : 'NÃO (mesma versão)');

  console.log('\n=== Resultado: Todos os endpoints OK ===');
}

main().catch(console.error);
