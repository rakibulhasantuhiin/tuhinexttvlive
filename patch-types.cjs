const fs = require('fs');
let code = fs.readFileSync('src/components/StreamPlayer.tsx', 'utf8');
code = code.replace(/let dashPlayer: dashjs\.MediaPlayerClass \| null = null;/g, `let dashPlayer: any = null;`);
code = code.replace(/let tsPlayer: mpegts\.Player \| null = null;/g, `let tsPlayer: any = null;`);
fs.writeFileSync('src/components/StreamPlayer.tsx', code);
