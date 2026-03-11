const https = require('https');
function get(url) {
  return new Promise((ok, er) => {
    https.get(url, {headers:{'User-Agent':'test'}}, r => {
      if (r.statusCode >= 300 && r.statusCode < 400) { get(r.headers.location).then(ok).catch(er); return; }
      let d = ''; r.on('data', c => d += c); r.on('end', () => ok(d));
    }).on('error', er);
  });
}

async function main() {
  const html = await get('https://frotagestor-pro.vercel.app/');
  const jsMatch = html.match(/src="\/assets\/(index-[^"]+\.js)"/);
  if (!jsMatch) { console.log('No JS found in HTML'); return; }
  console.log('JS file:', jsMatch[1]);
  
  const js = await get('https://frotagestor-pro.vercel.app/assets/' + jsMatch[1]);
  console.log('JS size:', js.length);
  console.log('Has Firebase URL:', js.includes('frotagestor-pro-sync'));
  console.log('Has placeholder YOUR_API_KEY:', js.includes('YOUR_API_KEY'));
  console.log('Has placeholder YOUR_PROJECT:', js.includes('YOUR_PROJECT'));
  
  const urlMatch = js.match(/https:\/\/[^"]*firebaseio\.com/);
  console.log('Firebase URL:', urlMatch ? urlMatch[0] : 'NOT FOUND');
  
  console.log('Has frotagestor/ path:', js.includes('frotagestor/'));
}
main().catch(console.error);
