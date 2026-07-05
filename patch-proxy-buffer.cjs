const fs = require('fs');
let code = fs.readFileSync('server.ts', 'utf8');

const target = `      } else {
        if (req.method === 'HEAD' || !fetchRes.body) {
           return res.end();
        }
        // @ts-ignore
        Readable.fromWeb(fetchRes.body).pipe(res);
      }`;

const replacement = `      } else {
        if (req.method === 'HEAD' || !fetchRes.body) {
           return res.end();
        }
        const arrayBuffer = await fetchRes.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);
        res.setHeader('Content-Length', buffer.length.toString());
        res.send(buffer);
      }`;

code = code.replace(target, replacement);
fs.writeFileSync('server.ts', code);
