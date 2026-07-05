const fs = require('fs');
let code = fs.readFileSync('src/components/StreamPlayer.tsx', 'utf8');

const target = `              modifyRequestURL: function (url: string) {
                  if (url && !url.startsWith('/api/proxy') && cleanUrl.startsWith('/api/proxy')) {
                      return \`/api/proxy?url=\${encodeURIComponent(url)}\`;
                  }
                  return url;
              }`;

const replacement = `              modifyRequestURL: function (req: any) {
                  let url = typeof req === 'string' ? req : (req && req.url ? req.url : req);
                  if (url && typeof url === 'string' && !url.startsWith('/api/proxy') && cleanUrl.startsWith('/api/proxy')) {
                      return \`/api/proxy?url=\${encodeURIComponent(url)}\`;
                  }
                  return url;
              }`;

code = code.replace(target, replacement);
fs.writeFileSync('src/components/StreamPlayer.tsx', code);
