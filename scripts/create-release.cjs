// Create a GitHub Release and upload the Electron installer
// Usage: node scripts/create-release.cjs

const https = require('https');
const fs = require('fs');
const path = require('path');

const REPO = 'Ananiasfeliciano/FrotaGestor-Pro';
const token = process.env.GH_TOKEN;
const VERSION = '1.0.0';

if (!token) {
  console.error('ERROR: GH_TOKEN not set');
  process.exit(1);
}

function api(method, apiPath, body = null, isUpload = false) {
  return new Promise((resolve, reject) => {
    const hostname = isUpload ? 'uploads.github.com' : 'api.github.com';
    const options = {
      hostname,
      path: apiPath,
      method,
      headers: {
        'Authorization': `Bearer ${token}`,
        'User-Agent': 'FrotaGestor-Release',
        'Accept': 'application/vnd.github+json',
        'X-GitHub-Api-Version': '2022-11-28'
      }
    };

    let bodyData = null;
    if (body && !isUpload) {
      bodyData = JSON.stringify(body);
      options.headers['Content-Type'] = 'application/json';
      options.headers['Content-Length'] = Buffer.byteLength(bodyData);
    }
    if (isUpload && body) {
      options.headers['Content-Type'] = 'application/octet-stream';
      options.headers['Content-Length'] = body.length;
    }

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', d => data += d);
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, body: data ? JSON.parse(data) : null });
        } catch {
          resolve({ status: res.statusCode, body: data });
        }
      });
    });
    req.on('error', reject);
    if (bodyData) req.write(bodyData);
    if (isUpload && body) req.write(body);
    req.end();
  });
}

async function main() {
  console.log(`=== Creating GitHub Release v${VERSION} ===\n`);

  // Check if release already exists
  const existRes = await api('GET', `/repos/${REPO}/releases/tags/v${VERSION}`);
  
  let releaseId;
  if (existRes.status === 200) {
    console.log(`Release v${VERSION} already exists (id: ${existRes.body.id})`);
    releaseId = existRes.body.id;
    
    // Check existing assets
    const assets = existRes.body.assets || [];
    console.log(`Existing assets: ${assets.map(a => a.name).join(', ') || 'none'}`);
    
    // Delete old installer asset if exists
    for (const asset of assets) {
      if (asset.name.includes('Setup')) {
        console.log(`Deleting old asset: ${asset.name}...`);
        await api('DELETE', `/repos/${REPO}/releases/assets/${asset.id}`);
      }
    }
  } else {
    // Create new release
    console.log(`Creating release v${VERSION}...`);
    const createRes = await api('POST', `/repos/${REPO}/releases`, {
      tag_name: `v${VERSION}`,
      name: `FrotaGestor Pro v${VERSION}`,
      body: `## FrotaGestor Pro v${VERSION}\n\n### Sistema de Gestão de Frotas\n\n**Novidades:**\n- Infraestrutura cloud completa\n- Backend API (Express + PostgreSQL + Redis)\n- Docker + docker-compose\n- CI/CD com GitHub Actions\n- Monitoramento (Prometheus + Grafana)\n- Logging centralizado (ELK Stack)\n- Sincronização Firebase\n\n### Downloads\n- **Windows**: FrotaGestor-Pro-Setup-${VERSION}.exe\n- **Web**: https://frotagestor-pro.vercel.app`,
      draft: false,
      prerelease: false
    });
    
    if (createRes.status === 201) {
      releaseId = createRes.body.id;
      console.log(`✅ Release created (id: ${releaseId})`);
    } else {
      console.error(`❌ Failed to create release: ${createRes.status}`, JSON.stringify(createRes.body));
      process.exit(1);
    }
  }

  // Upload installer
  const installerDir = path.join(__dirname, '..', 'installer-output');
  const files = [
    `FrotaGestor-Pro-Setup-${VERSION}.exe`,
    `FrotaGestor-Pro-Setup-${VERSION}.exe.blockmap`,
    'latest.yml'
  ];

  for (const fileName of files) {
    const filePath = path.join(installerDir, fileName);
    if (!fs.existsSync(filePath)) {
      console.log(`⚠ File not found: ${fileName}`);
      continue;
    }

    const fileData = fs.readFileSync(filePath);
    const sizeMB = (fileData.length / 1024 / 1024).toFixed(1);
    console.log(`\nUploading ${fileName} (${sizeMB} MB)...`);

    const uploadUrl = `/repos/${REPO}/releases/${releaseId}/assets?name=${encodeURIComponent(fileName)}`;
    const uploadRes = await api('POST', uploadUrl, fileData, true);

    if (uploadRes.status === 201) {
      console.log(`✅ ${fileName} uploaded`);
      console.log(`   URL: ${uploadRes.body.browser_download_url}`);
    } else {
      console.log(`❌ ${fileName} failed: ${uploadRes.status}`, JSON.stringify(uploadRes.body));
    }
  }

  console.log(`\n✅ Release: https://github.com/${REPO}/releases/tag/v${VERSION}`);
}

main().catch(console.error);
