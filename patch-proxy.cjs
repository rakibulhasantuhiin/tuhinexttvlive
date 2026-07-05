const fs = require('fs');
let code = fs.readFileSync('server.ts', 'utf8');

const target = `      } else {
        if (fetchRes.body) {
          // @ts-ignore
          Readable.fromWeb(fetchRes.body).pipe(res);
        } else {
          res.end();
        }
      }`;

const replacement = `      } else {
        const arrayBuffer = await fetchRes.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);
        res.send(buffer);
      }`;

code = code.replace(target, replacement);
fs.writeFileSync('server.ts', code);
