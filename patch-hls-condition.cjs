const fs = require('fs');
let code = fs.readFileSync('src/components/StreamPlayer.tsx', 'utf8');

const target = `    } else if (Hls.isSupported()) { // Default to HLS for unknown extensions`;
const replacement = `    } else if (Hls.isSupported() && (originalUrl.includes('.m3u8') || !originalUrl.match(/\\.(mp4|webm|ogg)$/i))) {`;

code = code.replace(target, replacement);
fs.writeFileSync('src/components/StreamPlayer.tsx', code);
