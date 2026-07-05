const fs = require('fs');
let code = fs.readFileSync('src/components/StreamPlayer.tsx', 'utf8');

const target = `      <video
        ref={videoRef}
        className="w-full h-full object-contain pointer-events-none"
        playsInline
      />`;

const replacement = `      <video
        ref={videoRef}
        className="w-full h-full object-contain pointer-events-none"
        playsInline
        autoPlay
        muted={isMuted}
        crossOrigin="anonymous"
      />`;

code = code.replace(target, replacement);
fs.writeFileSync('src/components/StreamPlayer.tsx', code);
