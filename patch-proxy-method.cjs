const fs = require('fs');
let code = fs.readFileSync('server.ts', 'utf8');

const target = `      const fetchRes = await fetch(targetUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
        }
      });`;

const replacement = `      const fetchRes = await fetch(targetUrl, {
        method: req.method,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Referer': new URL(targetUrl).origin,
          'Origin': new URL(targetUrl).origin
        }
      });`;

code = code.replace(target, replacement);
fs.writeFileSync('server.ts', code);
