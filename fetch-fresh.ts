import fetch from 'node-fetch';
async function test() {
  const m3u8Url = 'https://tv.beyondtaxconsultants.com/api/robi/lps/http://151.80.18.177:86/M6_HD/tracks-v1a1/mono.m3u8';
  const m3u8Res = await fetch(m3u8Url);
  const text = await m3u8Res.text();
  const lines = text.split('\n');
  const tsUrl = lines.find(l => l.endsWith('.ts'));
  console.log("TS URL:", tsUrl);
  if (tsUrl) {
    const tsRes = await fetch(tsUrl);
    console.log("TS Status:", tsRes.status);
    console.log("TS Size:", (await tsRes.arrayBuffer()).byteLength);
  }
}
test();
