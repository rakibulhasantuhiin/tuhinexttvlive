import fetch from 'node-fetch';
async function test() {
  const targetUrl = 'https://tv.beyondtaxconsultants.com/api/robi/proxy-segments/http%3A%2F%2F151.80.18.177%3A86%2FM6_HD%2Ftracks-v1a1%2F2026%2F07%2F05%2F19%2F02%2F55-06000.ts';
  let fetchRes = await fetch(targetUrl);
  console.log("No origin:", fetchRes.status);
  
  fetchRes = await fetch(targetUrl, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Referer': new URL(targetUrl).origin + '/',
      'Origin': new URL(targetUrl).origin
    }
  });
  console.log("With origin:", fetchRes.status, await fetchRes.text());
}
test();
