const fs = require('fs');
let code = fs.readFileSync('src/components/StreamPlayer.tsx', 'utf8');

code = code.replace(/modifyRequestURL: function \\(url: string\\) \\{[\\s\\S]*?return url;\\s*\\}/, `modifyRequestURL: function (req: any) {
                  let url = typeof req === 'string' ? req : (req && req.url ? req.url : req);
                  if (url && typeof url === 'string' && !url.startsWith('/api/proxy') && cleanUrl.startsWith('/api/proxy')) {
                      return \`/api/proxy?url=\${encodeURIComponent(url)}\`;
                  }
                  return url;
              }`);

fs.writeFileSync('src/components/StreamPlayer.tsx', code);
