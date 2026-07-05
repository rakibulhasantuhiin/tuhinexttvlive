import fetch from 'node-fetch';
async function test() {
  const targetUrl = 'https://tv.beyondtaxconsultants.com/api/robi/proxy-segments/http%3A%2F%2F151.80.18.177%3A86%2FM6_HD%2Ftracks-v1a1%2F2026%2F07%252F05%252F18%252F57%252F43-06000.ts';
  const fetchRes = await fetch(targetUrl, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Referer': new URL(targetUrl).origin + '/'
    }
  });
  console.log(fetchRes.status);
  if (fetchRes.status !== 200) console.log(await fetchRes.text());
  else console.log("Size:", (await fetchRes.buffer()).length);
}
test();
