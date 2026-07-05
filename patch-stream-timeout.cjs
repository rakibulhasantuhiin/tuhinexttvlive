const fs = require('fs');
let code = fs.readFileSync('src/components/StreamPlayer.tsx', 'utf8');

const target = `    let bufferTimeout: NodeJS.Timeout | null = null;
    const handleWaiting = () => {
      if (!isMounted) return;
      setIsBuffering(true);
      if (bufferTimeout) clearTimeout(bufferTimeout);
      bufferTimeout = setTimeout(() => {
        if (isMounted && isBuffering) {
          console.warn("Buffering timeout reached. Forcing error.");
          setError(true);
          setIsBuffering(false);
        }
      }, 15000);
    };`;

const replacement = `    const handleWaiting = () => {
      if (!isMounted) return;
      setIsBuffering(true);
    };`;

code = code.replace(target, replacement);

const targetPlaying = `    const handlePlaying = () => {
      if (!isMounted) return;
      setIsBuffering(false);
      setError(false);
      if (bufferTimeout) clearTimeout(bufferTimeout);
    };`;

const replacementPlaying = `    const handlePlaying = () => {
      if (!isMounted) return;
      setIsBuffering(false);
      setError(false);
    };`;

code = code.replace(targetPlaying, replacementPlaying);

// also let's bump the hls config timeout just in case
const hlsConfigTarget = `        hls = new Hls({
          enableWorker: true,
          lowLatencyMode: true,
        });`;

const hlsConfigReplacement = `        hls = new Hls({
          enableWorker: true,
          lowLatencyMode: false,
          manifestLoadingTimeOut: 30000,
          manifestLoadingMaxRetry: 5,
          levelLoadingTimeOut: 30000,
          levelLoadingMaxRetry: 5,
          fragLoadingTimeOut: 30000,
          fragLoadingMaxRetry: 5,
        });`;

code = code.replace(hlsConfigTarget, hlsConfigReplacement);

fs.writeFileSync('src/components/StreamPlayer.tsx', code);
