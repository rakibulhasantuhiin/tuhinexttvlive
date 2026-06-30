import React, { useEffect, useRef, useState, useCallback } from 'react';
import Hls from 'hls.js';
import dashjs from 'dashjs';
import { Play, Pause, Volume2, VolumeX, Maximize } from 'lucide-react';

interface StreamPlayerProps {
  url: string;
}

export default function StreamPlayer({ url }: StreamPlayerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [error, setError] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const controlsTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const handleMouseMove = useCallback(() => {
    setShowControls(true);
    if (controlsTimeoutRef.current) {
      clearTimeout(controlsTimeoutRef.current);
    }
    controlsTimeoutRef.current = setTimeout(() => {
      if (isPlaying) {
        setShowControls(false);
      }
    }, 2500);
  }, [isPlaying]);

  const handleMouseLeave = () => {
    if (isPlaying) {
      setShowControls(false);
    }
  };

  useEffect(() => {
    return () => {
      if (controlsTimeoutRef.current) clearTimeout(controlsTimeoutRef.current);
    };
  }, []);

  const togglePlay = (e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (videoRef.current) {
      if (isPlaying) {
        videoRef.current.pause();
        setIsPlaying(false);
        setShowControls(true);
      } else {
        videoRef.current.play().then(() => setIsPlaying(true)).catch(console.error);
      }
    }
  };

  const toggleMute = (e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (videoRef.current) {
      const newMuted = !videoRef.current.muted;
      videoRef.current.muted = newMuted;
      setIsMuted(newMuted);
    }
  };

  const toggleFullscreen = (e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (!document.fullscreenElement) {
      containerRef.current?.requestFullscreen().catch(console.error);
    } else {
      document.exitFullscreen().catch(console.error);
    }
  };

  useEffect(() => {
    let isMounted = true;
    setError(false);
    setIsPlaying(false);
    
    const video = videoRef.current;
    if (!video || !url) return;

    let hls: Hls | null = null;
    let dash: dashjs.MediaPlayerClass | null = null;

    const playVideo = async () => {
      if (!isMounted || !video) return;
      try {
        const promise = video.play();
        if (promise !== undefined) {
           await promise;
        }
        if (isMounted) setIsPlaying(true);
      } catch (err: any) {
        if (err.name !== 'AbortError' && err.name !== 'NotAllowedError') {
          console.warn("Auto-play failed:", err.message);
        }
        // Playback failed (usually due to autoplay policies), wait for user interaction
      }
    };

    if (url.includes('.m3u8') || url.includes('.ts')) {
      if (Hls.isSupported()) {
        hls = new Hls({
          debug: false,
          enableWorker: true,
          lowLatencyMode: false,
          manifestLoadingTimeOut: 10000,
          manifestLoadingMaxRetry: 3,
          levelLoadingTimeOut: 10000,
          levelLoadingMaxRetry: 3,
          fragLoadingTimeOut: 10000,
          fragLoadingMaxRetry: 3,
          startLevel: -1, // Auto level for fast start
          capLevelToPlayerSize: false, // Allow 4K/8K even if player is smaller
          maxBufferLength: 60, // Buffer 60s for smooth playback
          maxMaxBufferLength: 600,
          maxBufferSize: 200 * 1000 * 1000, // 200MB buffer for high-bitrate 4K/8K
        });
        hls.loadSource(url);
        hls.attachMedia(video);
        hls.on(Hls.Events.MANIFEST_PARSED, playVideo);
        hls.on(Hls.Events.ERROR, function (event, data) {
          if (data.fatal && isMounted) {
            switch (data.type) {
              case Hls.ErrorTypes.NETWORK_ERROR:
                console.warn("Network error encountered, trying to recover...");
                hls?.startLoad();
                break;
              case Hls.ErrorTypes.MEDIA_ERROR:
                console.warn("Media error encountered, trying to recover...");
                hls?.recoverMediaError();
                break;
              default:
                console.error("Fatal HLS error", data);
                hls?.destroy();
                setError(true);
                break;
            }
          }
        });
      } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
        // Native HLS support (Safari)
        video.src = url;
        video.addEventListener('loadedmetadata', playVideo);
        video.addEventListener('error', () => isMounted && setError(true));
      } else {
        if (isMounted) setError(true);
      }
    } else if (url.includes('.mpd')) {
      dash = dashjs.MediaPlayer().create();
      dash.updateSettings({
        debug: { logLevel: dashjs.Debug.LOG_LEVEL_NONE },
        streaming: {
          buffer: {
            fastSwitchEnabled: true,
            bufferTimeAtTopQuality: 30, // Increase buffer time for 4K/8K
            bufferToKeep: 30
          },
          abr: {
            limitBitrateByPortal: false // Allow 4K even if player is small
          }
        }
      });
      dash.initialize(video, url, true);
      dash.on(dashjs.MediaPlayer.events.ERROR, (e: any) => {
        console.error("DASH Error:", e);
        if (e.error === 'download' && isMounted) setError(true);
      });
    } else {
      // Fallback for direct MP4 or other native formats
      video.src = url;
      video.addEventListener('loadedmetadata', playVideo);
      video.addEventListener('error', () => isMounted && setError(true));
    }

    return () => {
      isMounted = false;
      if (hls) {
        hls.destroy();
      }
      if (dash) {
        dash.reset();
      }
      if (video) {
        video.removeAttribute('src');
        video.load();
      }
    };
  }, [url]);

  return (
    <div 
      ref={containerRef}
      className="w-full h-full relative bg-black flex items-center justify-center overflow-hidden group"
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      onClick={togglePlay}
    >
      {error && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/90 text-white z-10 px-4 text-center">
          <div className="w-16 h-16 mb-4 rounded-full bg-red-500/20 flex items-center justify-center">
             <svg className="w-8 h-8 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
               <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
             </svg>
          </div>
          <p className="text-red-400 font-bold text-lg mb-2">স্ট্রীম প্লে করতে সমস্যা হচ্ছে!</p>
          <p className="text-sm text-zinc-400 max-w-md">
            লিঙ্কটি হয়তো কাজ করছে না, অথবা অন্য সাইট থেকে প্লে করার অনুমতি (CORS) নেই। দয়া করে লিংকটি চেক করুন।
          </p>
        </div>
      )}
      
      {/* Custom Controls Overlay */}
      {!error && (
        <div 
          className={`absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black/80 to-transparent flex items-center gap-4 transition-opacity duration-300 z-20 ${showControls || !isPlaying ? 'opacity-100' : 'opacity-0'}`}
          onClick={(e) => e.stopPropagation()}
        >
          <button onClick={togglePlay} className="text-white hover:text-indigo-400 transition-colors">
            {isPlaying ? <Pause className="w-6 h-6" fill="currentColor" /> : <Play className="w-6 h-6" fill="currentColor" />}
          </button>
          
          <button onClick={toggleMute} className="text-white hover:text-indigo-400 transition-colors">
            {isMuted ? <VolumeX className="w-6 h-6" /> : <Volume2 className="w-6 h-6" />}
          </button>
          
          <div className="flex-1" />
          
          <button onClick={toggleFullscreen} className="text-white hover:text-indigo-400 transition-colors">
            <Maximize className="w-6 h-6" />
          </button>
        </div>
      )}

      <video
        ref={videoRef}
        playsInline
        autoPlay
        className="w-full h-full object-contain outline-none will-change-transform transform-gpu"
        style={{ transform: 'translateZ(0)', backfaceVisibility: 'hidden', perspective: 1000 }}
      />
    </div>
  );
}
