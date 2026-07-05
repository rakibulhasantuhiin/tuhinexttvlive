const fs = require('fs');
let code = fs.readFileSync('src/components/StreamPlayer.tsx', 'utf8');

const target = `    if (originalUrl.includes('.mpd')) {
      // DASH
      dashPlayer = dashjs.MediaPlayer().create();
      dashPlayer.initialize(video, cleanUrl, false);`;

const replacement = `    if (originalUrl.includes('.mpd')) {
      // DASH
      dashPlayer = dashjs.MediaPlayer().create();
      
      dashPlayer.extend("RequestModifier", function () {
          return {
              modifyRequestURL: function (url: string) {
                  if (url && !url.startsWith('/api/proxy') && cleanUrl.startsWith('/api/proxy')) {
                      // dash.js might pass a relative url that got wrongly resolved
                      // wait, if it was resolved against /api/proxy?url=...
                      // url might be http://localhost:3000/api/some.m4s
                      // let's just make it simple: if the player uses proxy, everything goes through proxy
                      // but dash.js resolves against the original url, which was the proxy url.
                      // Actually, if we just pass the originalUrl to dash.js instead of cleanUrl, 
                      // it will resolve correctly! But then it will fail CORS!
                      // So we pass originalUrl to dash.js, and modify ALL requests to go through proxy!
                      return \`/api/proxy?url=\${encodeURIComponent(url)}\`;
                  }
                  return url;
              }
          };
      }, true);
      
      dashPlayer.initialize(video, cleanUrl, false);`;

code = code.replace(target, replacement);

const originalUrlTarget = `dashPlayer.initialize(video, cleanUrl, false);`;
const originalUrlReplacement = `dashPlayer.initialize(video, originalUrl.startsWith('http') ? originalUrl : cleanUrl, false);`;

code = code.replace(originalUrlTarget, originalUrlReplacement);

fs.writeFileSync('src/components/StreamPlayer.tsx', code);
