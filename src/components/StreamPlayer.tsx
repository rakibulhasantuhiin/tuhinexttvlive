import React, { useEffect, useRef, useState, useCallback } from 'react';
import Hls from 'hls.js';
import dashjs from 'dashjs';
import mpegts from 'mpegts.js';
import { Play, Pause, Volume2, VolumeX, Maximize, Lock, Unlock } from 'lucide-react';

interface StreamPlayerProps {
  url: string;
}

export default function StreamPlayer({ url }: StreamPlayerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  
  const [error, setError] = useState(false);
  const [isPlaying, setIsPlaying] = useState(true);
  const [isMuted, setIsMuted] = useState(true);
  const [showControls, setShowControls] = useState(true);
  const controlsTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const [isLocked, setIsLocked] = useState(false);
  const [isBuffering, setIsBuffering] = useState(true);

  // Setup HLS and Video
  useEffect(() => {
    let hls: Hls | null = null;
    let dashPlayer: any = null;
    let tsPlayer: any = null;
    
    const video = videoRef.current;
    if (!video || !url) return;

    let isMounted = true;
    const cleanUrl = url.trim().startsWith('http') ? `/api/proxy?url=${encodeURIComponent(url.trim())}` : url.trim();
    const originalUrl = url.trim().toLowerCase();

    const startPlay = () => {
      if (!isMounted) return;
      setIsBuffering(false);
      const playPromise = video.play();
      if (playPromise !== undefined) {
        playPromise.then(() => {
          if (isMounted) setIsPlaying(true);
        }).catch((e) => {
          if (!isMounted) return;
          console.warn("Autoplay unmuted failed, trying muted...", e);
          video.muted = true;
          // React state update for icon
          setIsMuted(true);
          const mutedPlayPromise = video.play();
          if (mutedPlayPromise !== undefined) {
            mutedPlayPromise.then(() => {
              if (isMounted) setIsPlaying(true);
            }).catch(err => {
               if (!isMounted) return;
               console.error("Autoplay muted failed:", err);
               setIsPlaying(false);
            });
          }
        });
      }
    };

    if (originalUrl.includes('.mpd')) {
      // DASH
      dashPlayer = dashjs.MediaPlayer().create();
      
      dashPlayer.extend("RequestModifier", function () {
          return {
              modifyRequestURL: function (req: any) {
                  let url = typeof req === 'string' ? req : (req && req.url ? req.url : req);
                  if (url && typeof url === 'string' && !url.startsWith('/api/proxy') && cleanUrl.startsWith('/api/proxy')) {
                      return `/api/proxy?url=${encodeURIComponent(url)}`;
                  }
                  return url;
              }
          };
      }, true);
      
      dashPlayer.initialize(video, originalUrl.startsWith('http') ? originalUrl : cleanUrl, false);
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
    } else if (Hls.isSupported() && (originalUrl.includes('.m3u8') || !originalUrl.match(/\.(mp4|webm|ogg)$/i))) {
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
                console.warn(`Network error encountered, trying to recover... (${networkErrorCount})`);
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
    }

    const handleWaiting = () => {
      if (!isMounted) return;
      setIsBuffering(true);
    };
    const handlePlaying = () => {
      if (!isMounted) return;
      setIsBuffering(false);
      setError(false);
    };
    const handleError = (e: any) => {
      console.error("Video element error:", e);
      if (isMounted) {
        setError(true);
        setIsBuffering(false);
      }
    };
    
    video.addEventListener('waiting', handleWaiting);
    video.addEventListener('playing', handlePlaying);
    video.addEventListener('error', handleError);

    return () => {
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
    };
  }, [url]);

  const handleInteraction = useCallback(() => {
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

  const handleMouseMove = useCallback(() => {
    handleInteraction();
  }, [handleInteraction]);

  const handleMouseLeave = () => {
    if (isPlaying) {
      setShowControls(false);
    }
  };

  const handleContainerClick = () => {
    if (!isLocked) {
      handleInteraction();
    }
  };

  const togglePlay = (e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (videoRef.current) {
      if (isPlaying) {
        videoRef.current.pause();
        setIsPlaying(false);
      } else {
        videoRef.current.play().then(() => setIsPlaying(true)).catch(console.error);
      }
    }
    handleInteraction();
  };

  const toggleMute = (e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (videoRef.current) {
      videoRef.current.muted = !isMuted;
      setIsMuted(!isMuted);
    }
    handleInteraction();
  };

  const toggleFullscreen = async (e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    
    if (!document.fullscreenElement) {
      try {
        await containerRef.current?.requestFullscreen();
        if (screen.orientation && (screen.orientation as any).lock) {
          await (screen.orientation as any).lock('landscape').catch(() => {});
        }
      } catch (err) {
        console.error(err);
      }
    } else {
      try {
        if (screen.orientation && screen.orientation.unlock) {
          screen.orientation.unlock();
        }
        await document.exitFullscreen();
      } catch (err) {
        console.error(err);
      }
    }
  };

  const toggleLock = (e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setIsLocked(!isLocked);
    handleInteraction();
  };

  return (
    <div 
      ref={containerRef}
      className="w-full h-full relative bg-black flex items-center justify-center overflow-hidden group"
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      onClick={handleContainerClick}
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
      
      {/* Loading Spinner */}
      {isBuffering && !error && (
        <div className="absolute inset-0 flex items-center justify-center z-10 pointer-events-none">
          <div className="w-12 h-12 border-4 border-indigo-500/30 border-t-indigo-500 rounded-full animate-spin"></div>
        </div>
      )}

      {/* Custom Controls Overlay */}
      {!error && (
        <div 
          className={`absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black/90 via-black/40 to-transparent flex items-center gap-4 transition-opacity duration-300 z-30 ${showControls || !isPlaying ? 'opacity-100' : 'opacity-0'}`}
          onClick={(e) => e.stopPropagation()}
        >
          {isLocked ? (
            <>
              <div className="flex-1" />
              <button onClick={toggleLock} className="text-white hover:text-indigo-400 transition-colors bg-black/50 p-2 rounded-full backdrop-blur-sm">
                <Unlock className="w-6 h-6" />
              </button>
            </>
          ) : (
            <>
              <button onClick={togglePlay} className="text-white hover:text-indigo-400 transition-colors bg-black/40 p-2 rounded-full backdrop-blur-sm">
                {isPlaying ? <Pause className="w-6 h-6" fill="currentColor" /> : <Play className="w-6 h-6" fill="currentColor" />}
              </button>
              
              <button onClick={toggleMute} className="text-white hover:text-indigo-400 transition-colors bg-black/40 p-2 rounded-full backdrop-blur-sm">
                {isMuted ? <VolumeX className="w-6 h-6" /> : <Volume2 className="w-6 h-6" />}
              </button>
              
              <div className="flex-1" />
              
              <button onClick={toggleLock} className="text-white hover:text-indigo-400 transition-colors mr-2 bg-black/40 p-2 rounded-full backdrop-blur-sm">
                <Lock className="w-6 h-6" />
              </button>
              
              <button onClick={toggleFullscreen} className="text-white hover:text-indigo-400 transition-colors bg-black/40 p-2 rounded-full backdrop-blur-sm">
                <Maximize className="w-6 h-6" />
              </button>
            </>
          )}
        </div>
      )}

      {/* Lock Overlay Shield */}
      {isLocked && (
        <div 
          className="absolute inset-0 z-20 cursor-default"
          onClick={handleContainerClick}
        />
      )}

      <video
        ref={videoRef}
        className="w-full h-full object-contain pointer-events-none"
        playsInline
        autoPlay
        muted={isMuted}
        crossOrigin="anonymous"
      />
    </div>
  );
}
