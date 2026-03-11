// Setup GitHub Secrets for FrotaGestor Pro CI/CD
// Uses GitHub REST API with NaCl encryption (tweetsodium)
// Usage: node scripts/setup-secrets.cjs

const https = require('https');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const REPO = 'Ananiasfeliciano/FrotaGestor-Pro';
const token = process.env.GH_TOKEN;

if (!token) {
  console.error('ERROR: GH_TOKEN environment variable not set');
  process.exit(1);
}

function api(method, apiPath, body = null) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'api.github.com',
      path: apiPath,
      method,
      headers: {
        'Authorization': `Bearer ${token}`,
        'User-Agent': 'FrotaGestor-Setup',
        'Accept': 'application/vnd.github+json',
        'X-GitHub-Api-Version': '2022-11-28'
      }
    };
    if (body) {
      const bodyStr = JSON.stringify(body);
      options.headers['Content-Type'] = 'application/json';
      options.headers['Content-Length'] = Buffer.byteLength(bodyStr);
    }

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', d => data += d);
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, headers: res.headers, body: data ? JSON.parse(data) : null });
        } catch {
          resolve({ status: res.statusCode, headers: res.headers, body: data });
        }
      });
    });
    req.on('error', reject);
    if (body) req.write(JSON.stringify(body));
    req.end();
  });
}

// Simple NaCl sealed box using Node.js crypto (libsodium compatible)
function sealedBox(publicKeyBase64, secretValue) {
  const publicKey = Buffer.from(publicKeyBase64, 'base64');
  
  // Generate ephemeral keypair
  const ephemeral = crypto.generateKeyPairSync('x25519', {
    publicKeyEncoding: { type: 'spki', format: 'der' },
    privateKeyEncoding: { type: 'pkcs8', format: 'der' }
  });
  
  // This is simplified - GitHub actually expects libsodium sealed boxes
  // For proper encryption, we need tweetsodium
  return null;
}

async function main() {
  console.log('=== FrotaGestor Pro - GitHub Secrets Setup ===\n');

  // Check auth
  const userRes = await api('GET', '/user');
  if (userRes.status !== 200) {
    console.error('Auth failed:', userRes.status, JSON.stringify(userRes.body));
    process.exit(1);
  }
  console.log(`User: ${userRes.body.login}`);
  console.log(`Scopes: ${userRes.headers['x-oauth-scopes'] || 'Fine-grained PAT'}`);

  // Check repo access
  const repoRes = await api('GET', `/repos/${REPO}`);
  console.log(`Repo access: ${repoRes.status}`);
  if (repoRes.body.permissions) {
    console.log(`Permissions: ${JSON.stringify(repoRes.body.permissions)}`);
  }

  // Try to get public key for secrets
  const keyRes = await api('GET', `/repos/${REPO}/actions/secrets/public-key`);
  console.log(`\nSecrets API: ${keyRes.status}`);
  
  if (keyRes.status === 403) {
    console.log('\n❌ Token lacks "Actions Secrets" permission.');
    console.log('\nTo fix your fine-grained PAT:');
    console.log('1. Go to: https://github.com/settings/tokens');
    console.log('2. Click on your token');
    console.log('3. Under "Repository permissions", find "Secrets"');
    console.log('4. Set it to "Read and write"');
    console.log('5. Click "Update token"');
    console.log('6. Re-run this script\n');
    
    // Still output the secrets for manual entry
    outputSecrets();
    process.exit(1);
  }

  if (keyRes.status === 200) {
    console.log('\n✅ Token has secrets access! Setting secrets...\n');
    
    // Load tweetsodium for NaCl sealed-box encryption
    let seal;
    try {
      const sodium = require('tweetsodium');
      seal = sodium.seal;
    } catch {
      console.log('Installing tweetsodium...');
      const { execSync } = require('child_process');
      execSync('npm install tweetsodium --no-save', { stdio: 'inherit' });
      const sodium = require('tweetsodium');
      seal = sodium.seal;
    }
    
    const publicKey = keyRes.body.key;
    const keyId = keyRes.body.key_id;
    
    const secrets = getSecrets();
    
    for (const [name, value] of Object.entries(secrets)) {
      if (!value) {
        console.log(`  SKIP: ${name} (empty)`);
        continue;
      }
      
      // Encrypt using tweetsodium sealed box
      const messageBytes = Buffer.from(value);
      const keyBytes = Buffer.from(publicKey, 'base64');
      const encryptedBytes = seal(messageBytes, keyBytes);
      const encrypted = Buffer.from(encryptedBytes).toString('base64');
      
      const res = await api('PUT', `/repos/${REPO}/actions/secrets/${name}`, {
        encrypted_value: encrypted,
        key_id: keyId
      });
      
      if (res.status === 201 || res.status === 204) {
        console.log(`  ✅ ${name}`);
      } else {
        console.log(`  ❌ ${name}: ${res.status} ${JSON.stringify(res.body)}`);
      }
    }
    
    console.log('\n✅ Secrets configured!');
  }
  
  // Check releases access
  const relRes = await api('GET', `/repos/${REPO}/releases`);
  console.log(`\nReleases API: ${relRes.status}`);
  if (relRes.status === 200) {
    console.log(`Releases count: ${relRes.body.length}`);
    console.log('✅ Can create releases for Electron auto-update');
  }
}

function getSecrets() {
  // Read Firebase config from .env
  const envPath = path.join(__dirname, '..', '.env');
  const firebaseConfig = {};
  
  if (fs.existsSync(envPath)) {
    const lines = fs.readFileSync(envPath, 'utf8').split('\n');
    for (const line of lines) {
      const match = line.match(/^(VITE_FIREBASE_\w+)=(.+)$/);
      if (match) firebaseConfig[match[1]] = match[2].trim();
    }
  }
  
  // Read Vercel config
  const vercelPath = path.join(__dirname, '..', '.vercel', 'project.json');
  let vercelOrgId = '', vercelProjectId = '';
  if (fs.existsSync(vercelPath)) {
    const vercel = JSON.parse(fs.readFileSync(vercelPath, 'utf8'));
    vercelOrgId = vercel.orgId;
    vercelProjectId = vercel.projectId;
  }

  // Generate passwords
  const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  const gen = (n) => Array.from({length: n}, () => chars[Math.floor(Math.random() * chars.length)]).join('');

  return {
    JWT_SECRET: gen(64),
    DB_PASSWORD: gen(32),
    REDIS_PASSWORD: gen(32),
    GRAFANA_PASSWORD: gen(20),
    VITE_FIREBASE_API_KEY: firebaseConfig.VITE_FIREBASE_API_KEY || '',
    VITE_FIREBASE_AUTH_DOMAIN: firebaseConfig.VITE_FIREBASE_AUTH_DOMAIN || '',
    VITE_FIREBASE_DATABASE_URL: firebaseConfig.VITE_FIREBASE_DATABASE_URL || '',
    VITE_FIREBASE_PROJECT_ID: firebaseConfig.VITE_FIREBASE_PROJECT_ID || '',
    VITE_FIREBASE_STORAGE_BUCKET: firebaseConfig.VITE_FIREBASE_STORAGE_BUCKET || '',
    VITE_FIREBASE_MESSAGING_ID: firebaseConfig.VITE_FIREBASE_MESSAGING_ID || '',
    VITE_FIREBASE_APP_ID: firebaseConfig.VITE_FIREBASE_APP_ID || '',
    VERCEL_ORG_ID: vercelOrgId,
    VERCEL_PROJECT_ID: vercelProjectId
  };
}

function outputSecrets() {
  console.log('\n=== SECRETS (para configurar manualmente) ===\n');
  const secrets = getSecrets();
  for (const [name, value] of Object.entries(secrets)) {
    if (value) console.log(`${name}=${value}`);
  }
  console.log('\nPara configurar manualmente no GitHub:');
  console.log(`https://github.com/${REPO}/settings/secrets/actions`);
}

main().catch(console.error);
