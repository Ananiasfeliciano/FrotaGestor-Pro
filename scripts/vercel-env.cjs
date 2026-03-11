// Add Firebase env vars to Vercel for all environments
const { execSync } = require('child_process');

const envVars = {
  VITE_FIREBASE_API_KEY: 'AIzaSyC129NBWW98egEuiLrUs_NWz-spo441snU',
  VITE_FIREBASE_AUTH_DOMAIN: 'frotagestor-pro-sync.firebaseapp.com',
  VITE_FIREBASE_DATABASE_URL: 'https://frotagestor-pro-sync-default-rtdb.firebaseio.com',
  VITE_FIREBASE_PROJECT_ID: 'frotagestor-pro-sync',
  VITE_FIREBASE_STORAGE_BUCKET: 'frotagestor-pro-sync.firebasestorage.app',
  VITE_FIREBASE_MESSAGING_ID: '207912187989',
  VITE_FIREBASE_APP_ID: '1:207912187989:web:00b1821b071e10aaccbcdc',
};

const environments = ['preview', 'development'];

for (const [name, value] of Object.entries(envVars)) {
  for (const env of environments) {
    try {
      execSync(`echo ${value}| npx vercel env add ${name} ${env} --force`, {
        cwd: process.cwd(),
        stdio: 'pipe',
        timeout: 15000,
      });
      console.log(`OK  ${name} -> ${env}`);
    } catch (e) {
      console.log(`SKIP ${name} -> ${env} (may already exist)`);
    }
  }
}
console.log('\nDone!');
