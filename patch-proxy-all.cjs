const fs = require('fs');
let code = fs.readFileSync('server.ts', 'utf8');

const proxyStart = `  app.get('/api/proxy', async (req, res) => {`;
const newProxyStart = `  app.all('/api/proxy', async (req, res) => {`;

code = code.replace(proxyStart, newProxyStart);

const proxyStreamTarget = `      } else {
        const arrayBuffer = await fetchRes.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);
        res.send(buffer);
      }`;

const proxyStreamReplacement = `      } else {
        if (req.method === 'HEAD' || !fetchRes.body) {
           return res.end();
        }
        // @ts-ignore
        Readable.fromWeb(fetchRes.body).pipe(res);
      }`;

code = code.replace(proxyStreamTarget, proxyStreamReplacement);
fs.writeFileSync('server.ts', code);
