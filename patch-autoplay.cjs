const fs = require('fs');
let code = fs.readFileSync('src/components/StreamPlayer.tsx', 'utf8');

const target = `        hls.on(Hls.Events.MANIFEST_PARSED, () => {
          setIsBuffering(false);
          video.play().catch(e => {
            console.log("Auto-play prevented", e);
            setIsPlaying(false);
          });
        });`;

const replacement = `        hls.on(Hls.Events.MANIFEST_PARSED, () => {
          setIsBuffering(false);
          const playPromise = video.play();
          if (playPromise !== undefined) {
            playPromise.catch(e => {
              console.log("Auto-play prevented", e);
              setIsPlaying(false);
              setIsBuffering(false);
            });
          }
        });`;

code = code.replace(target, replacement);
fs.writeFileSync('src/components/StreamPlayer.tsx', code);
