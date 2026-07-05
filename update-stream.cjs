const fs = require('fs');
let code = fs.readFileSync('src/components/StreamPlayer.tsx', 'utf8');

const importTarget = `import Hls from 'hls.js';`;
const importReplacement = `import Hls from 'hls.js';
import dashjs from 'dashjs';
import mpegts from 'mpegts.js';`;

code = code.replace(importTarget, importReplacement);

const effectTarget = `    let hls: Hls | null = null;
    const video = videoRef.current;
    if (!video || !url) return;

    let isMounted = true;
    const cleanUrl = url.trim().startsWith('http') ? \`/api/proxy?url=\${encodeURIComponent(url.trim())}\` : url.trim();

    const startPlay = () => {`;

const effectReplacement = `    let hls: Hls | null = null;
    let dashPlayer: dashjs.MediaPlayerClass | null = null;
    let tsPlayer: mpegts.Player | null = null;
    
    const video = videoRef.current;
    if (!video || !url) return;

    let isMounted = true;
    const cleanUrl = url.trim().startsWith('http') ? \`/api/proxy?url=\${encodeURIComponent(url.trim())}\` : url.trim();
    const originalUrl = url.trim().toLowerCase();

    const startPlay = () => {`;

code = code.replace(effectTarget, effectReplacement);

const initTarget = `    if (Hls.isSupported() && (cleanUrl.includes('.m3u8') || cleanUrl.includes('.ts'))) {
      hls = new Hls({
        debug: false,
        enableWorker: true,
        lowLatencyMode: true
      });
      
      hls.loadSource(cleanUrl);
      hls.attachMedia(video);
      
      hls.on(Hls.Events.MANIFEST_PARSED, () => {
        startPlay();
      });
      
      let networkErrorCount = 0;
      hls.on(Hls.Events.ERROR, (event, data) => {
        if (data.fatal && isMounted) {
          switch (data.type) {
            case Hls.ErrorTypes.NETWORK_ERROR:
              networkErrorCount++;
              if (networkErrorCount <= 3) {
                console.warn(\`Network error encountered, trying to recover... (\${networkErrorCount})\`);
                setTimeout(() => hls?.startLoad(), 1000); // add delay
              } else {
                hls?.destroy();
                setError(true);
                setIsBuffering(false);
              }
              break;
            case Hls.ErrorTypes.MEDIA_ERROR:
              hls?.recoverMediaError();
              break;
            default:
              hls?.destroy();
              setError(true);
              break;
          }
        } else if (!data.fatal && isMounted) {
          console.warn("Non-fatal HLS error:", data);
        }
      });
    } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
      video.src = cleanUrl;
      video.addEventListener('loadedmetadata', startPlay);
    } else {
      video.src = cleanUrl;
      video.addEventListener('loadedmetadata', startPlay);
    }`;

const initReplacement = `    if (originalUrl.includes('.mpd')) {
      // DASH
      dashPlayer = dashjs.MediaPlayer().create();
      dashPlayer.initialize(video, cleanUrl, false);
      dashPlayer.on(dashjs.MediaPlayer.events.PLAYBACK_METADATA_LOADED, startPlay);
      dashPlayer.on(dashjs.MediaPlayer.events.ERROR, (e: any) => {
        console.error("DASH error:", e);
        if (isMounted) {
          setError(true);
          setIsBuffering(false);
        }
      });
    } else if (originalUrl.includes('.ts') && mpegts.getFeatureList().mseLivePlayback) {
      // MPEG-TS
      tsPlayer = mpegts.createPlayer({
        type: 'mse', // or 'flv', 'ts'. 'mse' handles ts well with mpegts
        isLive: true,
        url: cleanUrl
      });
      tsPlayer.attachMediaElement(video);
      tsPlayer.load();
      tsPlayer.on(mpegts.Events.ERROR, (err) => {
        console.error("MPEG-TS error:", err);
        if (isMounted) {
          setError(true);
          setIsBuffering(false);
        }
      });
      video.addEventListener('loadedmetadata', startPlay);
    } else if (Hls.isSupported() && (originalUrl.includes('.m3u8') || originalUrl.includes('.ts'))) {
      // HLS
      hls = new Hls({
        debug: false,
        enableWorker: true,
        lowLatencyMode: true
      });
      hls.loadSource(cleanUrl);
      hls.attachMedia(video);
      hls.on(Hls.Events.MANIFEST_PARSED, () => {
        startPlay();
      });
      let networkErrorCount = 0;
      hls.on(Hls.Events.ERROR, (event, data) => {
        if (data.fatal && isMounted) {
          switch (data.type) {
            case Hls.ErrorTypes.NETWORK_ERROR:
              networkErrorCount++;
              if (networkErrorCount <= 3) {
                console.warn(\`Network error encountered, trying to recover... (\${networkErrorCount})\`);
                setTimeout(() => hls?.startLoad(), 1000);
              } else {
                hls?.destroy();
                setError(true);
                setIsBuffering(false);
              }
              break;
            case Hls.ErrorTypes.MEDIA_ERROR:
              hls?.recoverMediaError();
              break;
            default:
              hls?.destroy();
              setError(true);
              break;
          }
        }
      });
    } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
      // Native Apple HLS
      video.src = cleanUrl;
      video.addEventListener('loadedmetadata', startPlay);
    } else {
      // Fallback
      video.src = cleanUrl;
      video.addEventListener('loadedmetadata', startPlay);
    }`;

code = code.replace(initTarget, initReplacement);

const cleanupTarget = `    return () => {
      isMounted = false;
      if (hls) {
        hls.destroy();
      }
      video.removeEventListener('waiting', handleWaiting);
      video.removeEventListener('playing', handlePlaying);
      video.removeEventListener('error', handleError);
      video.removeAttribute('src');
      video.load();
    };`;

const cleanupReplacement = `    return () => {
      isMounted = false;
      if (hls) {
        hls.destroy();
      }
      if (dashPlayer) {
        dashPlayer.destroy();
      }
      if (tsPlayer) {
        tsPlayer.destroy();
      }
      video.removeEventListener('waiting', handleWaiting);
      video.removeEventListener('playing', handlePlaying);
      video.removeEventListener('error', handleError);
      video.removeEventListener('loadedmetadata', startPlay);
      video.removeAttribute('src');
      video.load();
    };`;

code = code.replace(cleanupTarget, cleanupReplacement);

fs.writeFileSync('src/components/StreamPlayer.tsx', code);
