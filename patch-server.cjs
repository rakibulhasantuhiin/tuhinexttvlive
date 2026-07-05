const fs = require('fs');
let code = fs.readFileSync('server.ts', 'utf8');

const importTarget = `import express from 'express';`;
const importReplacement = `import express from 'express';\nimport { Readable } from 'stream';`;

if (!code.includes('import { Readable } from \'stream\';')) {
  code = code.replace(importTarget, importReplacement);
}

const proxyCode = `
  app.get('/api/proxy', async (req, res) => {
    const targetUrl = req.query.url as string;
    if (!targetUrl) return res.status(400).send('Missing url');

    try {
      const fetchRes = await fetch(targetUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Referer': new URL(targetUrl).origin,
          'Origin': new URL(targetUrl).origin
        }
      });

      const contentType = fetchRes.headers.get('content-type');
      if (contentType) res.setHeader('Content-Type', contentType);
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.status(fetchRes.status);

      if (targetUrl.includes('.m3u8') || (contentType && contentType.includes('mpegurl'))) {
        const text = await fetchRes.text();
        const baseUrl = new URL(targetUrl);
        const lines = text.split('\\n');
        const rewritten = lines.map(line => {
          if (line.trim().startsWith('#') || line.trim() === '') return line;
          let absUrl = line.trim();
          if (!absUrl.startsWith('http')) {
            absUrl = new URL(absUrl, baseUrl).toString();
          }
          return \`/api/proxy?url=\${encodeURIComponent(absUrl)}\`;
        });
        res.send(rewritten.join('\\n'));
      } else {
        if (fetchRes.body) {
          // @ts-ignore
          Readable.fromWeb(fetchRes.body).pipe(res);
        } else {
          res.end();
        }
      }
    } catch (err) {
      console.error("Proxy error:", err);
      res.status(500).send('Proxy error');
    }
  });
`;

if (!code.includes("app.get('/api/proxy'")) {
  const insertTarget = `app.get('/api/channels'`;
  code = code.replace(insertTarget, proxyCode + '\n  ' + insertTarget);
  fs.writeFileSync('server.ts', code);
}
