const https = require('https');

function get(url) {
  return new Promise((resolve, reject) => {
    https.get(url, { headers: { 'User-Agent': 'electron-updater' } }, (res) => {
      if (res.statusCode >= 300 && res.statusCode < 400) {
        get(res.headers.location).then(resolve).catch(reject);
      } else {
        let data = '';
        res.on('data', (chunk) => data += chunk);
        res.on('end', () => resolve({ status: res.statusCode, body: data }));
      }
    }).on('error', reject);
  });
}

async function main() {
  console.log('=== Checking latest.yml ===');
  const result = await get('https://github.com/Ananiasfeliciano/frotagestor-pro---sistema-de-gest-o-de-frotas/releases/latest/download/latest.yml');
  console.log('Status:', result.status);
  console.log('Content:');
  console.log(result.body);
}

main().catch(console.error);
