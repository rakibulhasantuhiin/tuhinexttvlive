const fs = require('fs');
let code = fs.readFileSync('src/components/StreamPlayer.tsx', 'utf8');

const target = `    const handleWaiting = () => isMounted && setIsBuffering(true);
    const handlePlaying = () => isMounted && setIsBuffering(false);
    const handleError = () => isMounted && setError(true);`;

const replacement = `    let bufferTimeout: NodeJS.Timeout | null = null;
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
    };
    const handlePlaying = () => {
      if (!isMounted) return;
      setIsBuffering(false);
      setError(false);
      if (bufferTimeout) clearTimeout(bufferTimeout);
    };
    const handleError = (e: any) => {
      console.error("Video element error:", e);
      if (isMounted) {
        setError(true);
        setIsBuffering(false);
      }
    };`;

code = code.replace(target, replacement);

const targetError = `            case Hls.ErrorTypes.NETWORK_ERROR:
              networkErrorCount++;
              if (networkErrorCount <= 3) {
                console.warn(\`Network error encountered, trying to recover... (\${networkErrorCount})\`);
                hls?.startLoad();
              } else {
                hls?.destroy();
                setError(true);
              }
              break;`;

const replacementError = `            case Hls.ErrorTypes.NETWORK_ERROR:
              networkErrorCount++;
              if (networkErrorCount <= 3) {
                console.warn(\`Network error encountered, trying to recover... (\${networkErrorCount})\`);
                setTimeout(() => hls?.startLoad(), 1000); // add delay
              } else {
                hls?.destroy();
                setError(true);
                setIsBuffering(false);
              }
              break;`;

code = code.replace(targetError, replacementError);

const targetNonFatal = `          }
        }
      });`;

const replacementNonFatal = `          }
        } else if (!data.fatal && isMounted) {
          console.warn("Non-fatal HLS error:", data);
        }
      });`;

code = code.replace(targetNonFatal, replacementNonFatal);

fs.writeFileSync('src/components/StreamPlayer.tsx', code);
