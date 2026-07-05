import React, { useEffect, useRef } from 'react';
import Hls from 'hls.js';

export default function StreamPlayer({ url }: { url: string }) {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    let hls: Hls | null = null;
    const video = videoRef.current;
    if (!video) return;

    if (Hls.isSupported() && url.includes('.m3u8')) {
      hls = new Hls();
      hls.loadSource(url);
      hls.attachMedia(video);
      hls.on(Hls.Events.MANIFEST_PARSED, () => {
        video.play().catch(console.error);
      });
    } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
      video.src = url;
      video.addEventListener('loadedmetadata', () => {
        video.play().catch(console.error);
      });
    } else {
      video.src = url;
    }

    return () => {
      if (hls) hls.destroy();
    };
  }, [url]);

  return <video ref={videoRef} controls />;
}
