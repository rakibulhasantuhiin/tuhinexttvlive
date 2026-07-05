const fs = require('fs');
let code = fs.readFileSync('src/components/StreamPlayer.tsx', 'utf8');

code = code.replace(
  `const cleanUrl = url.trim();`,
  `const cleanUrl = url.trim().startsWith('http') ? \`/api/proxy?url=\${encodeURIComponent(url.trim())}\` : url.trim();`
);

fs.writeFileSync('src/components/StreamPlayer.tsx', code);
