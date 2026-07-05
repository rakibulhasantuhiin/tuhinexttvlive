import fetch from 'node-fetch';
async function test() {
  const m3u8Url = 'http://localhost:3000/api/proxy?url=https%3A%2F%2Ftv.beyondtaxconsultants.com%2Fapi%2Frobi%2Flps%2Fhttp%3A%2F%2F151.80.18.177%3A86%2FM6_HD%2Ftracks-v1a1%2Fmono.m3u8';
  const m3u8Res = await fetch(m3u8Url);
  const text = await m3u8Res.text();
  const lines = text.split('\n');
  const tsUrl = lines.find(l => l.includes('.ts'));
  console.log("TS URL:", tsUrl);
  if (tsUrl) {
    const tsRes = await fetch(tsUrl.startsWith('/') ? 'http://localhost:3000' + tsUrl : tsUrl);
    console.log("TS Status:", tsRes.status);
    console.log("TS Size:", (await tsRes.arrayBuffer()).byteLength);
  }
}
test();
