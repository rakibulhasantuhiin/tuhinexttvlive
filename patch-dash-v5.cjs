const fs = require('fs');
let code = fs.readFileSync('src/components/StreamPlayer.tsx', 'utf8');

const target = `      dashPlayer.extend("RequestModifier", function () {
          return {
              modifyRequestURL: function (req: any) {
                  let url = typeof req === 'string' ? req : (req && req.url ? req.url : req);
                  if (url && typeof url === 'string' && !url.startsWith('/api/proxy') && cleanUrl.startsWith('/api/proxy')) {
                      return \`/api/proxy?url=\${encodeURIComponent(url)}\`;
                  }
                  return url;
              }
          };
      }, true);`;

const replacement = `      if (typeof dashPlayer.addRequestInterceptor === 'function') {
        dashPlayer.addRequestInterceptor((req: any) => {
           let url = req.url;
           if (url && typeof url === 'string' && !url.startsWith('/api/proxy') && cleanUrl.startsWith('/api/proxy')) {
               req.url = \`/api/proxy?url=\${encodeURIComponent(url)}\`;
           }
           return req;
        });
      } else if (typeof dashPlayer.extend === 'function') {
        dashPlayer.extend("RequestModifier", function () {
            return {
                modifyRequestURL: function (req: any) {
                    let url = typeof req === 'string' ? req : (req && req.url ? req.url : req);
                    if (url && typeof url === 'string' && !url.startsWith('/api/proxy') && cleanUrl.startsWith('/api/proxy')) {
                        return \`/api/proxy?url=\${encodeURIComponent(url)}\`;
                    }
                    return url;
                }
            };
        }, true);
      }`;

code = code.replace(target, replacement);
fs.writeFileSync('src/components/StreamPlayer.tsx', code);
