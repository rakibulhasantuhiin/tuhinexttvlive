import fetch from 'node-fetch';
async function test() {
  const targetUrl = 'https://prod-cdn01-live.toffeelive.com/live/FIFA-2026/sst/0/master_1500.m3u8?hdntl=Expires=1783352720~_GO=Generated~URLPrefix=aHR0cHM6Ly9wcm9kLWNkbjAxLWxpdmUudG9mZmVlbGl2ZS5jb20~Signature=AeQsclBUUq9wTD-jaDHZTdKJmwjYa0sbQ187VZq_j3clvSFjAFcIaP__EUU1mh9pTuCtJP-SG9fE4lHfmY1rV4IgD9MD';
  try {
    const fetchRes = await fetch(targetUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      }
    });
    console.log(fetchRes.status);
    const text = await fetchRes.text();
    console.log(text.substring(0, 100));
  } catch (err) {
    console.error(err);
  }
}
test();
