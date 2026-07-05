const fs = require('fs');
let code = fs.readFileSync('src/components/StreamPlayer.tsx', 'utf8');

const target = `    const startPlay = () => {
      if (!isMounted) return;
      setIsBuffering(false);
      video.play().then(() => {
        setIsPlaying(true);
      }).catch((e) => {
        console.error("Autoplay failed:", e);
        setIsPlaying(false);
      });
    };`;

const replacement = `    const startPlay = () => {
      if (!isMounted) return;
      setIsBuffering(false);
      const playPromise = video.play();
      if (playPromise !== undefined) {
        playPromise.then(() => {
          setIsPlaying(true);
        }).catch((e) => {
          console.warn("Autoplay unmuted failed, trying muted...", e);
          video.muted = true;
          // React state update for icon
          isMounted && setIsMuted(true);
          video.play().then(() => {
            setIsPlaying(true);
          }).catch(err => {
             console.error("Autoplay muted failed:", err);
             setIsPlaying(false);
          });
        });
      }
    };`;

code = code.replace(target, replacement);
fs.writeFileSync('src/components/StreamPlayer.tsx', code);
