/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useRef, useState, useMemo } from "react";
import { createPortal } from "react-dom";
import videojs from "video.js";
import "videojs-contrib-dash";
import type Player from "video.js/dist/video.js";
import {
  Tv,
  Play,
  Pause,
  Info,
  Search,
  Menu,
  X,
  Radio,
  RefreshCw,
  AlertCircle,
  Send,
  Database,
  Home,
  Settings,
  Sliders,
  Trash2,
  Globe,
  SlidersHorizontal,
  Lock,
  Unlock,
  Plus,
  Minus,
  Edit,
  Save,
  User,
  Crown,
  Check,
  Users,
  LogOut,
  LayoutDashboard,
  Bell,
  Eye,
  EyeOff,
  Shield,
  LayoutList,
  UploadCloud,
  FileUp,
  Mic,
  Download,
  ChevronUp,
  ChevronDown,
  Image,
  Zap,
  Volume2,
  VolumeX,
  RotateCcw,
  RotateCw,
  Maximize2,
  Minimize2,
ArrowLeft, Share2, Sun, Trophy, Film, Gamepad2, Music, Folder, ChevronRight} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { TuhinextLogoSVG } from "./components/TuhinextLogoSVG";
import { doc, getDoc, getDocs, setDoc, deleteDoc, onSnapshot, collection, query, where, getCountFromServer, updateDoc, writeBatch, increment, serverTimestamp } from "firebase/firestore";
import { ref, uploadBytesResumable, getDownloadURL } from "firebase/storage";
import { db, storage } from "./lib/firebase";
import { defaultChannels } from "./data/channels";

interface Channel {
  id: string;
  name: string;
  url: string;
  logo: string;
  category: string;
  isOnline: boolean;
  order?: number;
  isHidden?: boolean;
  logoPadding?: number; // 0 to 100, where 0 is full cover, higher is more padding
}

interface CustomCategory {
  id: string;
  name: string;
  logo?: string;
  isHidden?: boolean;
}

interface UserAccount {
  id: string;
  name: string;
  email: string;
  password?: string;
  createdAt: string;
  isAdmin?: boolean;
  role?: string;
}

const PLAYLIST_URL = "";
const DEFAULT_CHANNEL_LOGO = "https://digitalsynopsis.com/wp-content/uploads/2018/06/fifa-world-cup-logos-usa-mexico-canada-2026.jpg";

// Cleanup effect for permanent deletion if requested
// Removed as per new user request to add channels

const fetchRegisteredUsers = async (): Promise<UserAccount[]> => {
  try {
    const docSnap = await getDoc(doc(db, "settings", "registered_users"));
    const data = docSnap.exists() ? docSnap.data() : null;
    const error = null;
    if (data?.value && !error) {
      return JSON.parse(data.value);
    }
  } catch (e) {
    console.warn("Failed to fetch registered users from security db:", e);
  }
  try {
    const cached = localStorage.getItem("tuhinext_users");
    if (cached) return JSON.parse(cached);
  } catch {}
  return [];
};

const saveRegisteredUsers = async (users: UserAccount[]): Promise<boolean> => {
  try {
    localStorage.setItem("tuhinext_users", JSON.stringify(users));
    await setDoc(doc(db, "settings", "registered_users"), { value: JSON.stringify(users) }, { merge: true });
    const error = null;
    if (!error) return true;
  } catch (e) {
    console.warn("Failed to sync registered users to security db:", e);
  }
  return false;
};

const optimizeImage = (
  url: string | null | undefined,
  width = 100,
  height = 100,
) => {
  if (!url) return null;
  if (
    url.includes("picsum.photos") ||
    url.includes("githubusercontent.com") ||
    url.includes("base64")
  )
    return url;
  return `https://wsrv.nl/?url=${encodeURIComponent(url)}&w=${width}&h=${height}&fit=cover&output=webp`;
};

const handleImageUpload = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    if (file.size > 1024 * 1024) {
      reject(new Error("File size too large. Please use an image under 1MB."));
      return;
    }
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
};

const getEPGInfo = (channelName: string, category: string) => {
  const now = new Date();
  const currentHour = now.getHours();
  const currentMinute = now.getMinutes();
  const totalMinutesInDay = currentHour * 60 + currentMinute;
  const offset = (channelName.charCodeAt(0) || 0) + (channelName.length * 7);

  let shows = [
    "Morning Show Broadcast", "Daily Devotional Hour",
    "Lifestyle & Wellness Magazine", "Gourmet Cooking Special",
    "Cartoons and Animated Fun", "Exploring History Documentary",
    "Interactive Live Quiz Show", "Evening Music Beats",
    "Super Hits Chartbuster", "Acoustic Slow Jams",
    "Midnight Musings Live", "Classic Hits Selection"
  ];

  const catLower = category.toLowerCase();
  if (catLower.includes("news")) {
    shows = [
      "Morning Briefing Headlines", "BDIX Live Bulletin",
      "Global Report & Analytics", "The Prime Debate Arena",
      "Business and Stock Hour", "Desktop Bulletin Live",
      "Special Correspondent Focus", "Evening Prime News",
      "Prime Time Special Debate", "National Bulletins Tonight",
      "Late Night Analysis Roundtable", "World News Roundtable Hour"
    ];
  } else if (catLower.includes("sport")) {
    shows = [
      "Classic Goals Tour", "Live Cricket Pre-Match Analysis",
      "T20 Blast Weekly Rewind", "BDIX Sports Special Feature",
      "Grand Prix Racing Highlights", "Live Football Match Build-up",
      "Super Sports Live Broadcast", "The Football Talk Show",
      "Sports Night Live Bulletin", "Wrestling Mania Roundup",
      "Retro Soccer Classics Match", "Extreme Sports Extreme Arena"
    ];
  } else if (catLower.includes("movie") || catLower.includes("drama") || catLower.includes("serial")) {
    shows = [
      "Classic Drama Morning", "Mega Serial Hour Special",
      "Super Hit Bangla Movie", "Blockbuster Action Cinema",
      "Romantic Telefilm Selection", "Mega Serial Evening Prime",
      "Prime Drama Special Premiere", "Late Night Action Thriller",
      "Sci-Fi Double Feature Show", "Retro Classic Cinema Movie",
      "Horror Nights Film Festival", "Romantic Melody Serial"
    ];
  } else if (catLower.includes("music") || catLower.includes("song")) {
    shows = [
      "Morning Melody Sounds", "Mega Hits Counting Chart",
      "Super Hit Pop Classics", "Rap & Hip-Hop Wave",
      "Romantic Love Songs Playlists", "Evening Chartbusters Countdown",
      "Rock Classics Retrospective", "Acoustic Nights Acoustic Covers",
      "Lofi Chill Beats and Study Vibes", "Electronic Dance Anthems Live",
      "Night Lounge Soft Vocals", "Retro Gold Evergreen Tunes"
    ];
  } else if (catLower.includes("kid") || catLower.includes("cartoon")) {
    shows = [
      "Morning Animated Cartoons", "Educational Kids Explorer World",
      "Magical Fairy Tales", "Nursery Rhymes and Beats",
      "Fun Science Experiments Show", "Adventure Cartoons Hour",
      "Junior Quiz and Facts Show", "Evening Bedtime Stories",
      "Fantasy World Anime Adventures", "Late Night Relaxing Lullabies",
      "Classic Cartoons Marathon", "Kids Art & Craft Creations"
    ];
  }

  const numSlots = 12;
  const slotDurationMinutes = 120; // 2 hours
  const rawIdx = Math.floor(totalMinutesInDay / slotDurationMinutes);
  const currentSlotIdx = (rawIdx + (offset % numSlots)) % numSlots;
  const nextSlotIdx = (currentSlotIdx + 1) % numSlots;

  const currentProgram = shows[currentSlotIdx];
  const upcomingProgram = shows[nextSlotIdx];

  const currentSlotStartHour = (rawIdx * 2) % 24;
  const currentSlotEndHour = ((rawIdx + 1) * 2) % 24;

  const startHourStr = String(currentSlotStartHour).padStart(2, '0');
  const endHourStr = String(currentSlotEndHour).padStart(2, '0');
  const currentPeriod = `${startHourStr}:00 - ${endHourStr}:00`;

  const minutesCurrentPassed = totalMinutesInDay % slotDurationMinutes;
  const progress = Math.round((minutesCurrentPassed / slotDurationMinutes) * 100);

  return {
    currentProgram,
    currentPeriod,
    progress,
    upcomingProgram,
    upcomingStart: `${endHourStr}:00`
  };
};

const getStreamType = (url: string) => {
  const lowercaseUrl = url.toLowerCase();
  if (lowercaseUrl.includes(".mpd")) return "application/dash+xml";
  if (lowercaseUrl.includes(".m3u8") || lowercaseUrl.includes(".m3u") || lowercaseUrl.includes("manifest") || lowercaseUrl.includes("playlist") || lowercaseUrl.includes("vnd.apple.mpegurl")) return "application/x-mpegURL";
  if (lowercaseUrl.includes(".ts") || lowercaseUrl.includes(".m2ts") || lowercaseUrl.includes("mpegts") || lowercaseUrl.includes(".mts")) return "video/mp2t";
  if (lowercaseUrl.includes(".flv") || lowercaseUrl.includes(".f4v")) return "video/x-flv";
  if (lowercaseUrl.includes(".mp4") || lowercaseUrl.includes(".m4v") || lowercaseUrl.includes(".m4s") || lowercaseUrl.includes(".fmp4")) return "video/mp4";
  if (lowercaseUrl.includes(".webm")) return "video/webm";
  if (lowercaseUrl.includes(".mkv")) return "video/x-matroska";
  if (lowercaseUrl.includes(".mov") || lowercaseUrl.includes(".qt")) return "video/quicktime";
  if (lowercaseUrl.includes(".avi")) return "video/x-msvideo";
  if (lowercaseUrl.includes(".wmv")) return "video/x-ms-wmv";
  if (lowercaseUrl.includes(".3gp")) return "video/3gpp";
  if (lowercaseUrl.includes(".ogg") || lowercaseUrl.includes(".ogv")) return "video/ogg";
  
  // Robust fallback for streams that might not have extensions but are HLS
  if (lowercaseUrl.includes("m3u8") || lowercaseUrl.includes("ts") || lowercaseUrl.includes("chunk")) {
    return "application/x-mpegURL";
  }
  
  return "application/x-mpegURL"; // Default fallback
};

const VideoPlayer = ({
  src,
  streamQuality = "auto",
  onReady,
  onError,
  onActiveQualityChanged,
  onOpenExternal,
  channelName,
  categoryName,
  onBack,
}: {
  src: string;
  streamQuality?: string;
  onReady: (player: Player) => void;
  onError?: () => void;
  onActiveQualityChanged?: (height: number) => void;
  onOpenExternal?: () => void;
  channelName?: string;
  categoryName?: string;
  onBack?: () => void;
}) => {
  const videoRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const playerRef = useRef<Player | null>(null);
  const [localActiveQuality, setLocalActiveQuality] = useState<number | null>(null);
  const [playerEl, setPlayerEl] = useState<HTMLElement | null>(null);
  const [userActive, setUserActive] = useState(true);
  const retryCountRef = useRef(0);
  const [isRetrying, setIsRetrying] = useState(false);
  const [isWaiting, setIsWaiting] = useState(true);

  // Detect YouTube streams
  const isYouTube = useMemo(() => {
    return src.includes("youtube.com") || src.includes("youtu.be");
  }, [src]);

  const youTubeId = useMemo(() => {
    if (!isYouTube) return null;
    if (src.includes("/live/")) {
      const parts = src.split("/live/");
      if (parts[1]) {
        return parts[1].split(/[?#]/)[0];
      }
    }
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
    const match = src.match(regExp);
    return (match && match[2].length === 11) ? match[2] : null;
  }, [src, isYouTube]);

  // Detect iframe-compatible or non-stream URLs (embedded players)
  const isIframe = useMemo(() => {
    if (isYouTube) return false;
    if (src.includes("embed") || src.includes("iframe") || src.includes("player.vimeo.com") || src.includes("daily.xyz")) {
      return true;
    }
    const hasVideoExtension = /\.(m3u8|mpd|mp4|webm|ts|flv|mkv|3gp|mov|avi|ogg|m2ts|m4s|fmp4|m4v)(\?|$)/i.test(src);
    const looksLikeStream = src.includes("/hls/") || src.includes("/stream/") || src.includes("/live/") || src.includes("chunklist") || src.includes(".m3u8") || src.includes(".ts") || src.includes("manifest") || src.includes("playlist") || src.includes("mpegts") || src.includes(".mpd") || src.includes("master");
    
    return !hasVideoExtension && !looksLikeStream && (src.startsWith("http://") || src.startsWith("https://"));
  }, [src, isYouTube]);

  // Multi-stage CORS fallback pipeline
  const [stage, setStage] = useState<"direct" | "https-upgrade" | "proxy-cors" | "proxy-org" | "proxy-allorigins" | "proxy-codetabs" | "proxy-dev" | "proxy-shaka" | "proxy-thing" | "proxy-is" | "proxy-any" | "proxy-ultra" | "proxy-cloud" | "proxy-scrapper" | "proxy-winter" | "proxy-ls" | "proxy-raw" | "proxy-m3u8" | "proxy-final" | "proxy-bridge" | "failed">("direct");
  const [hasFailedHttpsUpgrade, setHasFailedHttpsUpgrade] = useState(false);
  const [hasPermanentError, setHasPermanentError] = useState(false);
  const [playerErrorMessage, setPlayerErrorMessage] = useState<string | null>(null);

  const getUrlForStage = (originalUrl: string, currentStage: typeof stage) => {
    if (currentStage === "direct") return originalUrl;
    
    // If the URL already contains a known proxy, we should be careful about double-proxying
    const isAlreadyProxied = originalUrl.includes("corsproxy.io") || 
                             originalUrl.includes("corsproxy.org") || 
                             originalUrl.includes("allorigins.win") || 
                             originalUrl.includes("codetabs.com") ||
                             originalUrl.includes("bridged.cc") ||
                             originalUrl.includes("thingproxy") ||
                             originalUrl.includes("cors.eu.org") ||
                             originalUrl.includes("htmldriven.com") ||
                             originalUrl.includes("workers.dev/r/");

    if (currentStage === "https-upgrade") {
      if (originalUrl.startsWith("http://")) {
        return originalUrl.replace("http://", "https://");
      }
    }
    
    if (currentStage === "proxy-cors") {
      return `https://corsproxy.io/?url=${encodeURIComponent(originalUrl)}`;
    }
    if (currentStage === "proxy-org") {
      return `https://corsproxy.org/?url=${encodeURIComponent(originalUrl)}`;
    }
    if (currentStage === "proxy-allorigins") {
      return `https://api.allorigins.win/raw?url=${encodeURIComponent(originalUrl)}`;
    }
    if (currentStage === "proxy-codetabs") {
      return `https://api.codetabs.com/v1/proxy?quest=${encodeURIComponent(originalUrl)}`;
    }
    if (currentStage === "proxy-dev") {
      return `https://cors-anywhere.azm.workers.dev/${originalUrl}`;
    }
    if (currentStage === "proxy-shaka") {
      return `https://shaka-player-demo.appspot.com/proxy?url=${encodeURIComponent(originalUrl)}`;
    }
    if (currentStage === "proxy-thing") {
      return `https://thingproxy.freeboard.io/fetch/${originalUrl}`;
    }
    if (currentStage === "proxy-is") {
      return `https://cors-anywhere-is.herokuapp.com/${originalUrl}`;
    }
    if (currentStage === "proxy-any") {
      return `https://cors-anywhere.herokuapp.com/${originalUrl}`;
    }
    if (currentStage === "proxy-ultra") {
      return `https://cors.eu.org/${originalUrl}`;
    }
    if (currentStage === "proxy-cloud") {
      return `https://cors-proxy.htmldriven.com/?url=${encodeURIComponent(originalUrl)}`;
    }
    if (currentStage === "proxy-scrapper") {
      return `https://scrapper.run/?url=${encodeURIComponent(originalUrl)}`;
    }
    if (currentStage === "proxy-winter") {
      return `https://winter-proxy.bridged.cc/${originalUrl}`;
    }
    if (currentStage === "proxy-ls") {
      return `https://ls-proxy.bridged.cc/${originalUrl}`;
    }
    if (currentStage === "proxy-raw") {
      return `https://api.allorigins.win/get?url=${encodeURIComponent(originalUrl)}`;
    }
    if (currentStage === "proxy-m3u8") {
      return `https://m3u8proxy.herokuapp.com/proxy?url=${encodeURIComponent(originalUrl)}`;
    }
    if (currentStage === "proxy-final") {
      return `https://cors-proxy.fringe.zone/${originalUrl}`;
    }
    if (currentStage === "proxy-bridge") {
      return `https://proxy.cors.sh/${originalUrl}`;
    }
    return originalUrl;
  };

  const [activeUrl, setActiveUrl] = useState(() => {
    if (src.startsWith("http://") && window.location.protocol === "https:") {
      return src.replace("http://", "https://");
    }
    return src;
  });

  // Reset active state parameters when source changes
  useEffect(() => {
    setStage("direct");
    setHasFailedHttpsUpgrade(false);
    setHasPermanentError(false);
    setPlayerErrorMessage(null);
    setIsWaiting(true);
    setIsRetrying(false);
    setIsLocked(false);
    setShowControls(true);
  }, [src]);

  useEffect(() => {
    if (isYouTube || isIframe) return;
    const newUrl = getUrlForStage(src, stage);
    if (stage !== "direct") {
      console.log(`[VideoPlayer] Connection Stage: ${stage} | URL: ${newUrl}`);
    }
    setActiveUrl(newUrl);
  }, [stage, src, isYouTube, isIframe]);

  // Custom IPTV player controls overlay states
  const [isPlaying, setIsPlaying] = useState(true);
  const [isMuted, setIsMuted] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [aspectRatio, setAspectRatio] = useState<"contain" | "fill" | "cover">("contain");
  const [isLocked, setIsLocked] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const controlsTimeoutRef = useRef<any>(null);

  const resetControlsTimeout = () => {
    setShowControls(true);
    if (controlsTimeoutRef.current) {
      clearTimeout(controlsTimeoutRef.current);
    }
    controlsTimeoutRef.current = setTimeout(() => {
      setShowControls(false);
    }, 1500);
  };

  const handleContainerInteraction = () => {
    resetControlsTimeout();
  };

  const formatTime = (seconds: number) => {
    if (isNaN(seconds) || seconds === Infinity) return "00:00";
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = Math.floor(seconds % 60);
    const parts = [
      h > 0 ? h : null,
      m.toString().padStart(2, "0"),
      s.toString().padStart(2, "0"),
    ].filter(Boolean);
    return parts.join(":");
  };

  // Helper to advance to the next pipeline stage on failure/timeout
  const stageRef = useRef(stage);
  useEffect(() => {
    stageRef.current = stage;
  }, [stage]);

  const advanceFallbackStage = () => {
    const currentStage = stageRef.current;
    
    // IP-based URLs are extremely likely to fail direct connection in secure contexts (Mixed Content/CORS)
    const isIPUrl = /\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}/.test(src);
    const isAlreadyProxied = src.includes("workers.dev/r/") || src.includes("corsproxy") || src.includes("allorigins") || src.includes("codetabs");

    if (currentStage === "direct") {
      if (src.startsWith("http://") && window.location.protocol === "https:") {
        setStage("https-upgrade");
      } else if (isIPUrl) {
        // Jump straight to robust proxies for IP URLs
        setStage("proxy-cors");
      } else if (isAlreadyProxied) {
        setStage("proxy-org");
      } else {
        setStage("proxy-cors");
      }
    } else if (currentStage === "https-upgrade") {
      setStage("proxy-cors");
    } else if (currentStage === "proxy-cors") {
      setStage("proxy-org");
    } else if (currentStage === "proxy-org") {
      setStage("proxy-allorigins");
    } else if (currentStage === "proxy-allorigins") {
      setStage("proxy-codetabs");
    } else if (currentStage === "proxy-codetabs") {
      setStage("proxy-dev");
    } else if (currentStage === "proxy-dev") {
      setStage("proxy-shaka");
    } else if (currentStage === "proxy-shaka") {
      setStage("proxy-thing");
    } else if (currentStage === "proxy-thing") {
      setStage("proxy-is");
    } else if (currentStage === "proxy-is") {
      setStage("proxy-any");
    } else if (currentStage === "proxy-any") {
      setStage("proxy-ultra");
    } else if (currentStage === "proxy-ultra") {
      setStage("proxy-cloud");
    } else if (currentStage === "proxy-cloud") {
      setStage("proxy-scrapper");
    } else if (currentStage === "proxy-scrapper") {
      setStage("proxy-winter");
    } else if (currentStage === "proxy-winter") {
      setStage("proxy-ls");
    } else if (currentStage === "proxy-ls") {
      setStage("proxy-raw");
    } else if (currentStage === "proxy-raw") {
      setStage("proxy-m3u8");
    } else if (currentStage === "proxy-m3u8") {
      setStage("proxy-final");
    } else if (currentStage === "proxy-final") {
      setStage("proxy-bridge");
    } else if (currentStage === "proxy-bridge") {
      setStage("failed");
      setHasPermanentError(true);
      setPlayerErrorMessage("The stream failed to connect directly and through all secure proxies. It might be offline or blocked by the provider.");
    }
  };

  // Active waiting timeout detector to prevent endless Loading screens
  useEffect(() => {
    if (isYouTube || isIframe) return;
    let timeoutId: any;

    if (isWaiting && !hasPermanentError) {
      // Shorter timeout for direct/https stages, longer for proxies. 4K/8K needs more time.
      const isIPUrl = /\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}/.test(src);
      const timeoutDuration = (stage === "direct" || stage === "https-upgrade") 
        ? (isIPUrl ? 4000 : 8000) 
        : 22000; // Increased proxy timeout for stability
      
      timeoutId = setTimeout(() => {
        console.warn(`[VideoPlayer] Playback stage "${stageRef.current}" timed out after ${timeoutDuration/1000}s. Advancing...`);
        advanceFallbackStage();
      }, timeoutDuration);
    }

    return () => {
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, [isWaiting, stage, src, isYouTube, isIframe]);

  useEffect(() => {
    if (isYouTube || isIframe) return;
    if (!activeUrl) return;
    if (playerRef.current && activeUrl) {
      playerRef.current.src({
        src: activeUrl,
        type: getStreamType(activeUrl),
      });
      playerRef.current.play().catch(() => {});
      return;
    }

    if (!playerRef.current && videoRef.current) {
      const videoElement = document.createElement("video-js");
      videoElement.setAttribute("crossorigin", "anonymous");
      videoElement.setAttribute("playsinline", "true");
      videoElement.classList.add(
        "vjs-big-play-centered",
        "vjs-16-9",
        "vjs-fluid",
      );
      videoRef.current.appendChild(videoElement);
      setPlayerEl(videoElement);

      const player = (playerRef.current = videojs(
        videoElement,
        {
          autoplay: true,
          muted: true,
          controls: true,
          responsive: true,
          fluid: true,
          preload: "auto",
          liveui: true,
          nativeControlsForTouch: false,
          inactivityTimeout: 3000,
          playbackRates: [0.5, 0.75, 1, 1.25, 1.5, 2],
          controlBar: {
            children: [
              "playToggle",
              "volumePanel",
              "currentTimeDisplay",
              "timeDivider",
              "durationDisplay",
              "progressControl",
              "liveDisplay",
              "playbackRateMenuButton",
              "remainingTimeDisplay",
              "fullscreenToggle",
            ],
          },
          sources: [
            {
              src: activeUrl,
              type: getStreamType(activeUrl),
            },
          ],
          liveTracker: {
            trackingThreshold: 0,
            liveTolerance: 15,
          },
          html5: {
            vhs: {
              overrideNative: true,
              enableLowInitialPlaylist: true,
              limitRenditionByPlayerDimensions: false,
              useDevicePixelRatio: true,
              fastQualityChange: true,
              smoothQualityChange: true,
              backBufferLength: 120,
              withCredentials: false,
              handleManifestRedirects: true,
              llhls: true,
              goalBufferLength: 120,
              maxGoalBufferLength: 300,
              enableWorkers: true,
              experimentalBufferBasedABR: true,
              bandwidth: 8000000, // Higher initial bandwidth for 4K/8K
              useNetworkInformationApi: true,
              allowSeperateSecurityDomains: true,
              cacheEncryptionKeys: true,
            },
          },
          // DASH specific settings
          dash: {
            useDevicePixelRatio: true,
            enableLowInitialPlaylist: true,
          },
        },
        () => {
          onReady(player);
        },
      ));

      player.on("useractive", () => setUserActive(true));
      player.on("userinactive", () => setUserActive(false));

      // Buffer / Loading state listeners
      const showLoader = () => setIsWaiting(true);
      const hideLoader = () => setIsWaiting(false);

      player.on("waiting", showLoader);
      player.on("seeking", showLoader);
      player.on("loadstart", showLoader);
      
      player.on("playing", () => {
        hideLoader();
        setIsPlaying(true);
      });
      player.on("pause", () => {
        setIsPlaying(false);
      });

      player.on("ended", () => {
        // If live stream ends unexpectedly, try to jump to live edge or re-sync
        const anyPlayer = player as any;
        if (anyPlayer.liveTracker && anyPlayer.liveTracker.isLive()) {
          console.log("[VideoPlayer] Live stream ended unexpectedly, jumping to live edge...");
          anyPlayer.liveTracker.seekToLiveEdge();
          player.play().catch(() => {});
        }
      });

      player.on("error", () => {
        const error = player.error();
        if (error) {
          console.error("[VideoPlayer] Player error:", error);
          // Advance on network or encryption errors
          if (!hasPermanentError && (error.code === 2 || error.code === 4)) {
            advanceFallbackStage();
          }
        }
        hideLoader();
      });

      player.on("vhs-error", (e: any) => {
        console.warn("[VideoPlayer] VHS error:", e);
        if (!hasPermanentError && e && (e.errorType === "playlist" || e.errorType === "manifest" || e.code === 2)) {
           advanceFallbackStage();
        }
      });

      // Stalling prevention heartbeat
      let lastTime = 0;
      let lastCheck = Date.now();
      let stallingCount = 0;
      const heartbeatInterval = setInterval(() => {
        if (player && !player.paused() && !player.seeking()) {
          const currentTime = player.currentTime();
          const now = Date.now();
          const anyPlayer = player as any;
          
          if (currentTime === lastTime && now - lastCheck > 2500) {
            stallingCount++;
            console.warn(`[VideoPlayer] Playback appears stalled (attempt ${stallingCount}), attempting recovery...`);
            
            if (stallingCount >= 2) {
              console.warn("[VideoPlayer] Persistent stalling, advancing fallback stage...");
              advanceFallbackStage();
              stallingCount = 0;
            } else {
              if (anyPlayer.liveTracker && anyPlayer.liveTracker.isLive()) {
                anyPlayer.liveTracker.seekToLiveEdge();
              } else {
                player.currentTime(player.currentTime() + 0.1);
              }
              player.play().catch(() => {});
            }
            lastCheck = now;
          } else if (currentTime !== lastTime) {
            lastTime = currentTime;
            lastCheck = now;
            stallingCount = 0;
          }
        }
      }, 1500);

      player.on("dispose", () => clearInterval(heartbeatInterval));
      
      player.on("seeked", hideLoader);
      player.on("loadeddata", hideLoader);
      player.on("error", hideLoader);

      player.on("volumechange", () => {
        setIsMuted(player.muted());
      });

      player.on("timeupdate", () => {
        setCurrentTime(player.currentTime() || 0);
        setDuration(player.duration() || 0);
      });
    }
  }, [activeUrl]);

  useEffect(() => {
    const handleFsChange = () => {
      const isFs = !!document.fullscreenElement && document.fullscreenElement === containerRef.current;
      setIsFullscreen(isFs);
      if (isFs) {
        if (screen.orientation && "lock" in screen.orientation) {
          (screen.orientation as any).lock("landscape").catch(() => {});
        }
      } else {
        if (screen.orientation && "unlock" in screen.orientation) {
          screen.orientation.unlock();
        }
      }
    };

    document.addEventListener("fullscreenchange", handleFsChange);
    document.addEventListener("webkitfullscreenchange", handleFsChange);
    document.addEventListener("mozfullscreenchange", handleFsChange);
    document.addEventListener("msfullscreenchange", handleFsChange);

    return () => {
      document.removeEventListener("fullscreenchange", handleFsChange);
      document.removeEventListener("webkitfullscreenchange", handleFsChange);
      document.removeEventListener("mozfullscreenchange", handleFsChange);
      document.removeEventListener("msfullscreenchange", handleFsChange);
    };
  }, []);

  useEffect(() => {
    if (isYouTube || isIframe) return;
    if (playerRef.current && activeUrl) {
      const player = playerRef.current;
      const currentSrc = player.src();
      if (currentSrc !== activeUrl) {
        retryCountRef.current = 0;
        setIsRetrying(false);
        setIsWaiting(true);
        player.pause();
        player.src({ 
          src: activeUrl, 
          type: getStreamType(activeUrl)
        });
        player.load();
        player.play().catch(() => {});
      }
    }
  }, [activeUrl, isYouTube, isIframe]);

  // Synchronize dynamic bandwidth enforcement when activeUrl changes
  useEffect(() => {
    if (isYouTube || isIframe) return;
    const player = playerRef.current;
    if (!player) return;

    let hasSampled = false;
    let sampleTimeout: any;

    const applyQuality = () => {
      try {
        const tech = player.tech({ IWillNotUseThisInPlugins: true }) as any;
        if (tech && tech.vhs) {
          const vhs = tech.vhs;
          const reps = vhs.representations();
          if (!reps || reps.length === 0) return;

          if (streamQuality === "auto") {
            // Automated stream quality selection logic that samples user connection speed
            let measuredBandwidth = vhs.systemBandwidth || vhs.bandwidth || 0;
            
            if (!measuredBandwidth && vhs.stats && vhs.stats.bandwidth) {
              measuredBandwidth = vhs.stats.bandwidth;
            }

            if (measuredBandwidth > 0) {
              let optimalRep = reps[0];
              let maxFitBandwidth = -1;

              reps.forEach((rep: any) => {
                const repBandwidth = rep.bandwidth || 0;
                if (repBandwidth <= measuredBandwidth * 0.8 && repBandwidth > maxFitBandwidth) {
                  maxFitBandwidth = repBandwidth;
                  optimalRep = rep;
                }
              });

              if (maxFitBandwidth === -1) {
                optimalRep = reps.reduce((prev: any, curr: any) => ((prev.bandwidth || Infinity) < (curr.bandwidth || Infinity) ? prev : curr));
              }

              reps.forEach((rep: any) => {
                rep.enabled(rep.id === optimalRep.id);
              });
              
              console.log(`[Auto-Quality] Selected ${optimalRep.height}p`);
            }
          } else {
            // Manual quality mapping
            let targetHeight = 0;
            if (streamQuality === "1080p") targetHeight = 1080;
            else if (streamQuality === "720p") targetHeight = 720;
            else if (streamQuality === "480p") targetHeight = 480;
            else if (streamQuality === "360p") targetHeight = 360;
            else if (streamQuality === "low") targetHeight = 240;

            if (targetHeight > 0) {
              let bestMatch = reps[0];
              let minDiff = Infinity;
              reps.forEach((rep: any) => {
                if (rep.height && rep.height <= targetHeight) {
                  const diff = targetHeight - rep.height;
                  if (diff < minDiff) {
                    minDiff = diff;
                    bestMatch = rep;
                  }
                }
              });
              reps.forEach((rep: any) => {
                rep.enabled(rep.id === bestMatch.id);
              });
            } else {
              reps.forEach((rep: any) => rep.enabled(true));
            }
          }
        }
      } catch (e) {
        console.error("Failed to set optimal quality", e);
      }
    };

    if (streamQuality !== "auto") {
      setTimeout(applyQuality, 100);
    }

    const performSampling = () => {
      if (hasSampled) return;
      hasSampled = true;
      sampleTimeout = setTimeout(applyQuality, 5000);
    };

    const onPlaying = () => {
      performSampling();
      retryCountRef.current = 0;
      setIsRetrying(false);
    };

    if (!player.paused()) {
      onPlaying();
    }

    player.on("playing", onPlaying);

    return () => {
      if (sampleTimeout) clearTimeout(sampleTimeout);
      if (player) {
        player.off("playing", onPlaying);
      }
    };
  }, [activeUrl, streamQuality, isYouTube, isIframe]);

  // Reset active quality state when channel source changes
  useEffect(() => {
    if (isYouTube || isIframe) return;
    setLocalActiveQuality(null);
  }, [activeUrl, isYouTube, isIframe]);

  // Read active playing video resolution height periodically
  useEffect(() => {
    if (isYouTube || isIframe) return;
    const player = playerRef.current;
    if (!player) return;

    let intervalId: any;

    const monitorResolution = () => {
      try {
        const tech = player.tech({ IWillNotUseThisInPlugins: true }) as any;
        if (tech && tech.vhs) {
          const media = tech.vhs.playlists?.media();
          if (media && media.attributes && media.attributes.RESOLUTION) {
            const h = media.attributes.RESOLUTION.height;
            if (h) {
              setLocalActiveQuality(h);
              if (onActiveQualityChanged) {
                onActiveQualityChanged(h);
              }
            }
          } else if (player.videoHeight && player.videoHeight()) {
            const h = player.videoHeight();
            if (h) {
              setLocalActiveQuality(h);
              if (onActiveQualityChanged) {
                onActiveQualityChanged(h);
              }
            }
          }
        } else if (player.videoHeight && player.videoHeight()) {
          const h = player.videoHeight();
          if (h) {
            setLocalActiveQuality(h);
            if (onActiveQualityChanged) {
              onActiveQualityChanged(h);
            }
          }
        }
      } catch (e) {}
    };

    player.on("loadedmetadata", monitorResolution);
    player.on("playing", monitorResolution);
    player.on("ratechange", monitorResolution);
    
    intervalId = setInterval(monitorResolution, 2000);

    return () => {
      clearInterval(intervalId);
      if (player) {
        player.off("loadedmetadata", monitorResolution);
        player.off("playing", monitorResolution);
        player.off("ratechange", monitorResolution);
      }
    };
  }, [activeUrl, onActiveQualityChanged, isYouTube, isIframe]);

  useEffect(() => {
    if (isYouTube || isIframe) return;
    const player = playerRef.current;
    if (player) {
      const handleError = () => {
        const err = player.error();
        if (err) {
          console.warn("[VideoPlayer] Playback error encountered. Advancing fallback stage.");
          advanceFallbackStage();
        }
      };

      player.off("error");
      player.on("error", handleError);
    }
  }, [activeUrl, src, onError, isYouTube, isIframe]);

  useEffect(() => {
    const player = playerRef.current;
    return () => {
      if (player && !player.isDisposed()) {
        player.dispose();
        playerRef.current = null;
        setPlayerEl(null);
      }
    };
  }, []);

  const handlePlayPause = () => {
    if (!playerRef.current) return;
    if (playerRef.current.paused()) {
      playerRef.current.play().catch(() => {});
      setIsPlaying(true);
    } else {
      playerRef.current.pause();
      setIsPlaying(false);
    }
  };

  const handleMuteUnmute = () => {
    if (!playerRef.current) return;
    const muted = !playerRef.current.muted();
    playerRef.current.muted(muted);
    setIsMuted(muted);
  };

  const handleSeek = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!playerRef.current || !duration) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const pos = (e.clientX - rect.left) / rect.width;
    playerRef.current.currentTime(pos * duration);
  };

  const handleRewind = () => {
    if (!playerRef.current) return;
    const curr = playerRef.current.currentTime();
    playerRef.current.currentTime(Math.max(0, curr - 10));
  };

  const handleForward = () => {
    if (!playerRef.current) return;
    const curr = playerRef.current.currentTime();
    playerRef.current.currentTime(Math.min(duration || curr + 10, curr + 10));
  };

  const toggleFullscreen = () => {
    if (!containerRef.current) return;
    
    if (!document.fullscreenElement) {
      containerRef.current.requestFullscreen().catch(err => {
        console.error(`Error attempting to enable full-screen mode: ${err.message}`);
      });
      setIsFullscreen(true);
    } else {
      document.exitFullscreen();
      setIsFullscreen(false);
    }
  };

  const cycleAspectRatio = () => {
    if (aspectRatio === "contain") setAspectRatio("fill");
    else if (aspectRatio === "fill") setAspectRatio("cover");
    else setAspectRatio("contain");
  };

  const handlePiP = async () => {
    try {
      const video = playerEl?.querySelector("video");
      if (video && document.pictureInPictureEnabled) {
        if (document.pictureInPictureElement) {
          await document.exitPictureInPicture();
        } else {
          await video.requestPictureInPicture();
        }
      }
    } catch (e) {
      console.warn("PiP not supported", e);
    }
  };

  if (isYouTube && youTubeId) {
    return (
      <div className="relative w-full h-full bg-black rounded-[1.2rem] overflow-hidden border border-white/5">
        {/* Top Control Bar with Back button */}
        <div className="absolute top-4 left-4 z-50 flex items-center gap-3 pointer-events-auto">
          <button 
            onClick={onBack}
            className="w-10 h-10 rounded-full border border-white/15 bg-black/60 flex items-center justify-center hover:bg-white/10 text-white transition-all cursor-pointer"
          >
            <ArrowLeft size={18} />
          </button>
          <div className="text-left bg-black/60 px-3 py-1.5 rounded-xl border border-white/5 backdrop-blur-md">
            <h4 className="text-xs font-black text-white tracking-tight uppercase line-clamp-1">{channelName || "YouTube Live"}</h4>
            <div className="flex items-center gap-1.5 mt-0.5">
              <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse shrink-0" />
              <span className="text-[8px] font-bold text-red-400 uppercase tracking-widest">YouTube • Live</span>
            </div>
          </div>
        </div>

        <iframe
          src={`https://www.youtube.com/embed/${youTubeId}?autoplay=1&mute=0&controls=1&rel=0`}
          title={channelName || "YouTube Player"}
          className="w-full h-full border-0 absolute inset-0"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
          allowFullScreen
          referrerPolicy="no-referrer"
        />
      </div>
    );
  }

  if (isIframe) {
    return (
      <div className="relative w-full h-full bg-black rounded-[1.2rem] overflow-hidden border border-white/5">
        {/* Top Control Bar with Back button */}
        <div className="absolute top-4 left-4 z-50 flex items-center gap-3 pointer-events-auto">
          <button 
            onClick={onBack}
            className="w-10 h-10 rounded-full border border-white/15 bg-black/60 flex items-center justify-center hover:bg-white/10 text-white transition-all cursor-pointer"
          >
            <ArrowLeft size={18} />
          </button>
          <div className="text-left bg-black/60 px-3 py-1.5 rounded-xl border border-white/5 backdrop-blur-md">
            <h4 className="text-xs font-black text-white tracking-tight uppercase line-clamp-1">{channelName || "Web Embed"}</h4>
            <div className="flex items-center gap-1.5 mt-0.5">
              <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse shrink-0" />
              <span className="text-[8px] font-bold text-primary uppercase tracking-widest">Web Stream • Player</span>
            </div>
          </div>
        </div>

        <iframe
          src={src}
          title={channelName || "Web Player"}
          className="w-full h-full border-0 absolute inset-0 bg-black"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
          allowFullScreen
          referrerPolicy="no-referrer"
        />
      </div>
    );
  }

  return (
    <div 
      ref={containerRef}
      data-vjs-player 
      className={`relative w-full h-full group select-none overflow-hidden rounded-[1.2rem] border border-white/5 shadow-2xl bg-black ${
        isLocked ? "z-[9995]" : "z-10"
      } ${
        aspectRatio === "fill" ? "aspect-fill" : aspectRatio === "cover" ? "aspect-cover" : "aspect-contain"
      }`}
      onMouseMove={handleContainerInteraction}
      onTouchStart={handleContainerInteraction}
      onMouseEnter={handleContainerInteraction}
      onClick={handleContainerInteraction}
    >
      <style>{`
        .video-js .vjs-control-bar { display: none !important; }
        .video-js .vjs-big-play-button { display: none !important; }
        .video-js .vjs-loading-spinner, .vjs-loading-spinner { display: none !important; visibility: hidden !important; }
        .aspect-fill video { object-fit: fill !important; }
        .aspect-cover video { object-fit: cover !important; }
        .aspect-contain video { object-fit: contain !important; }
        .vjs-tech { pointer-events: none !important; }
      `}</style>
      
      {isLocked && createPortal(
        <div 
          className="fixed inset-0 z-[9990] bg-black/[0.02] cursor-not-allowed pointer-events-auto"
          onClick={(e) => {
            e.stopPropagation();
            e.preventDefault();
            handleContainerInteraction();
          }}
          onTouchStart={(e) => {
            e.stopPropagation();
            handleContainerInteraction();
          }}
        />,
        document.body
      )}

      <div ref={videoRef} className="w-full h-full" />
      
      {(isWaiting || isRetrying) && !hasPermanentError && (
        <div className="absolute inset-0 z-40 flex flex-col items-center justify-center bg-black/75 backdrop-blur-sm transition-all duration-500">
          <div className="w-12 h-12 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
        </div>
      )}

      {hasPermanentError && (
        <div className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-gradient-to-b from-[#141829] to-[#0a0d18] p-6 text-center overflow-y-auto">
          <div className="w-14 h-14 rounded-full bg-red-500/10 border border-red-500/20 flex items-center justify-center text-red-400 mb-4 shadow-lg shadow-red-500/5 shrink-0">
            <AlertCircle size={28} />
          </div>
          
          <h3 className="text-base sm:text-lg font-black text-white uppercase tracking-wide mb-2">Stream Offline or Restricted</h3>
          <p className="text-white/70 text-xs font-medium max-w-md mb-6 leading-relaxed">
            {playerErrorMessage || "This channel is currently offline or requires external browser resources to load. Please click below to play smoothly in a separate browser player."}
          </p>

          <div className="flex flex-wrap gap-3 justify-center">
            <button
              onClick={() => {
                setHasPermanentError(false);
                setStage("direct");
                setIsWaiting(true);
                setIsRetrying(false);
              }}
              className="px-5 py-3 bg-white/10 hover:bg-white/15 text-white text-[10px] font-black rounded-xl uppercase tracking-widest transition-all cursor-pointer active:scale-95 border border-white/10"
            >
              Retry Connection
            </button>
            <button
              onClick={onBack}
              className="px-5 py-3 bg-white/5 hover:bg-white/10 text-white/60 hover:text-white text-[10px] font-black rounded-xl uppercase tracking-widest transition-all cursor-pointer active:scale-95"
            >
              Directory
            </button>
          </div>
        </div>
      )}

      {/* Beautiful IPTV Custom Overlay Controls */}
      <div 
        className={`absolute inset-0 z-30 flex flex-col justify-between p-4 bg-gradient-to-b from-black/80 via-transparent to-black/80 transition-opacity duration-300 pointer-events-none ${
          showControls ? "opacity-100" : "opacity-0"
        }`}
      >
        {/* Top Control Bar */}
        <div className="flex items-center justify-between pointer-events-auto w-full">
          {!isLocked ? (
            <div className="flex items-center gap-3">
              <button 
                onClick={onBack}
                className="w-10 h-10 rounded-full border border-white/15 bg-black/40 flex items-center justify-center hover:bg-white/10 text-white transition-all cursor-pointer"
              >
                <ArrowLeft size={18} />
              </button>
              <div className="text-left">
                <h4 className="text-sm font-black text-white tracking-tight uppercase line-clamp-1">{channelName || "Live Channel"}</h4>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse shrink-0" />
                  <span className="text-[8px] font-bold text-emerald-400 uppercase tracking-widest">
                    Live • {localActiveQuality ? (localActiveQuality >= 2160 ? "4K" : localActiveQuality >= 1080 ? "UHD" : localActiveQuality >= 720 ? "FHD" : `${localActiveQuality}P`) : "Auto"}
                  </span>
                  {categoryName && (
                    <span className="text-[8px] text-white/40 font-bold uppercase tracking-widest border-l border-white/10 pl-1.5 ml-1.5">
                      {categoryName}
                    </span>
                  )}
                </div>
              </div>
            </div>
          ) : (
            <div className="w-1" />
          )}

          {/* Top Right Buttons */}
          <div className="flex items-center gap-2">
            {!isLocked && (
              <>
                {onOpenExternal && (
                  <button 
                    onClick={onOpenExternal}
                    title="Open in New Tab"
                    className="w-10 h-10 rounded-full border border-white/15 bg-black/40 flex items-center justify-center hover:bg-white/10 text-white transition-all cursor-pointer"
                  >
                    <Maximize2 size={16} />
                  </button>
                )}
                <button 
                  onClick={handleMuteUnmute}
                  className="w-10 h-10 rounded-full border border-white/15 bg-black/40 flex items-center justify-center hover:bg-white/10 text-white transition-all cursor-pointer"
                >
                  {isMuted ? <VolumeX size={16} /> : <Volume2 size={16} />}
                </button>
                <button 
                  onClick={cycleAspectRatio}
                  title={`Shift Aspect Ratio: ${aspectRatio.toUpperCase()}`}
                  className="w-10 h-10 rounded-full border border-white/15 bg-black/40 flex items-center justify-center hover:bg-white/10 text-white transition-all cursor-pointer text-[10px] font-black uppercase tracking-wider"
                >
                  {aspectRatio === "contain" ? "16:9" : aspectRatio === "fill" ? "Fill" : "Zoom"}
                </button>
              </>
            )}
            
            {/* Screen Lock Lockscreen Toggle Button */}
            <button 
              onClick={(e) => {
                e.stopPropagation();
                setIsLocked(!isLocked);
                resetControlsTimeout();
              }}
              className={`w-10 h-10 rounded-full border border-white/15 bg-black/40 flex items-center justify-center hover:bg-white/10 text-white transition-all cursor-pointer ${
                isLocked ? "bg-primary border-primary text-white scale-105 animate-none" : ""
              }`}
            >
              {isLocked ? <Lock size={16} /> : <Unlock size={16} />}
            </button>
          </div>
        </div>

        {/* Center Control Box */}
        <div className="flex items-center justify-center gap-8 pointer-events-auto">
          {!isLocked ? (
            <>
              <button 
                onClick={handleRewind}
                className="w-12 h-12 rounded-full border border-white/15 bg-black/40 flex items-center justify-center hover:bg-white/10 text-white/80 hover:text-white transition-all cursor-pointer"
              >
                <RotateCcw size={18} />
              </button>
              <button 
                onClick={handlePlayPause}
                className="w-18 h-18 rounded-full bg-primary flex items-center justify-center text-white shadow-xl shadow-primary/30 hover:scale-105 active:scale-95 transition-all cursor-pointer"
              >
                {isPlaying ? <Pause size={24} className="fill-white text-white ml-0" /> : <Play size={24} className="fill-white text-white ml-1" />}
              </button>
              <button 
                onClick={handleForward}
                className="w-12 h-12 rounded-full border border-white/15 bg-black/40 flex items-center justify-center hover:bg-white/10 text-white/80 hover:text-white transition-all cursor-pointer"
              >
                <RotateCw size={18} />
              </button>
            </>
          ) : (
            <div className="w-14 h-14 bg-black/60 rounded-full border border-white/10 flex items-center justify-center text-primary backdrop-blur-md shadow-2xl">
              <Lock size={22} className="text-primary animate-pulse" />
            </div>
          )}
        </div>

        {/* Bottom Control Bar */}
        <div className="flex flex-col gap-2 w-full pointer-events-auto">
          {!isLocked && (
            <div className="flex items-center justify-between gap-4">
              {/* Current Playback Time */}
              <span className="text-[9px] font-black text-white/50 tracking-wider font-mono">{formatTime(currentTime)}</span>
              
              {/* Custom Elegant Seek Bar Slider */}
              <div 
                onClick={handleSeek}
                className="flex-1 h-1 bg-white/15 rounded-full cursor-pointer relative overflow-hidden group/seek select-none"
              >
                <div 
                  className="bg-primary h-full rounded-full transition-all"
                  style={{ width: `${duration ? (currentTime / duration) * 100 : 0}%` }}
                />
              </div>

              {/* Remaining / Total duration */}
              <span className="text-[9px] font-black text-white/50 tracking-wider font-mono">
                {duration > 0 ? formatTime(duration) : "LIVE"}
              </span>

              {/* PiP & Fullscreen Buttons */}
              <div className="flex items-center gap-1.5">
                <button 
                  onClick={handlePiP}
                  title="Picture in Picture Mode"
                  className="w-8 h-8 rounded-full border border-white/10 bg-black/40 flex items-center justify-center hover:bg-white/10 text-white/60 hover:text-white transition-all cursor-pointer"
                >
                  <Tv size={13} />
                </button>
                <button 
                  onClick={toggleFullscreen}
                  title="Fullscreen"
                  className="w-8 h-8 rounded-full border border-white/10 bg-black/40 flex items-center justify-center hover:bg-white/10 text-white/60 hover:text-white transition-all cursor-pointer"
                >
                  {isFullscreen ? <Minimize2 size={13} /> : <Maximize2 size={13} />}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

const getCategoryLogo = (categoryName: string): string => {
  const normalized = categoryName.toLowerCase().trim();
  if (normalized.includes("world cup") || normalized.includes("fifa")) {
    return "https://digitalsynopsis.com/wp-content/uploads/2018/06/fifa-world-cup-logos-usa-mexico-canada-2026.jpg"; // FIFA World Cup 2026 Logo
  }
  if (normalized.includes("bangladesh") || normalized.includes("bd")) {
    return "https://i.ibb.co/VMybPhF/bd.png"; // Bangladesh flag circle
  }
  if (normalized.includes("india") || normalized.includes("indian")) {
    return "https://upload.wikimedia.org/wikipedia/commons/4/41/Flag_of_India.svg"; // India flag circle
  }
  if (normalized.includes("kids")) {
    return "https://i.ibb.co/q9Wms9v/kids.png"; // Playful Kids Logo
  }
  if (normalized.includes("sports") || normalized.includes("play")) {
    return "https://i.ibb.co/2vT0ySq/sports.png"; // Sports blue circle trophy
  }
  if (normalized.includes("documentary") || normalized.includes("history")) {
    return "https://upload.wikimedia.org/wikipedia/commons/a/ac/Camera_film_icon.svg"; // Documentary
  }
  if (normalized.includes("movies") || normalized.includes("cinema") || normalized.includes("entertainment")) {
    return "https://upload.wikimedia.org/wikipedia/commons/6/6a/Movie_slate_icon.svg"; // Movies
  }
  // Fallback beautiful TV icon
  return "https://digitalsynopsis.com/wp-content/uploads/2018/06/fifa-world-cup-logos-usa-mexico-canada-2026.jpg";
};

export default function App() {
  const [channels, setChannels] = useState<Channel[]>(() => {
    try {
      const cached = localStorage.getItem("tuhinext_channels");
      if (cached) {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch (e) {}
    return defaultChannels as Channel[];
  });
  const [showSplash, setShowSplash] = useState(true);
  const [activeChannel, setActiveChannel] = useState<Channel | null>(null);
  const [brokenChannelIds, setBrokenChannelIds] = useState<Set<string>>(
    new Set(),
  );
  const [searchQuery, setSearchQuery] = useState("");
  const [headerSearchQuery, setHeaderSearchQuery] = useState("");
  const [isSidebarOpen, setIsSidebarOpen] = useState(window.innerWidth > 1024);
  const [isListening, setIsListening] = useState(false);
  
  const handleVoiceSearch = () => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) return;

    const recognition = new SpeechRecognition();
    recognition.lang = 'en-US';
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;

    recognition.onstart = () => {
      setIsListening(true);
      setHeaderSearchQuery("");
      setSearchQuery("");
      setShowSearch(true);
    };

    recognition.onresult = (event: any) => {
      const transcript = event.results[0][0].transcript;
      setHeaderSearchQuery(transcript);
      setSearchQuery(transcript);
      if (searchInputRef.current) {
        searchInputRef.current.value = transcript;
      }
      setIsListening(false);
      
      // Auto-select if there's a good match
      setTimeout(() => {
        const q = transcript.toLowerCase();
        const matches = channels.filter(c => 
          !c.isHidden && c.name.toLowerCase().includes(q)
        );
        if (matches.length > 0) {
          setActiveChannel(matches[0]);
          setHeaderSearchQuery("");
          setSearchQuery("");
          setShowSearch(false);
        }
      }, 500);
    };

    recognition.onerror = (event: any) => {
      console.error("Speech recognition error", event.error);
      setIsListening(false);
    };

    recognition.onend = () => {
      setIsListening(false);
    };

    recognition.start();
  };

  const [isLoading, setIsLoading] = useState(() => {
    // High traffic optimization: Never start in loading state if we have ANY cache or defaults
    try {
      const cached = localStorage.getItem("tuhinext_channels");
      if (cached && JSON.parse(cached).length > 0) return false;
    } catch (e) {}
    
    // Even if no cache, if we have defaults, don't show loading screen - show defaults immediately
    if (defaultChannels && defaultChannels.length > 0) return false;
    
    return false; // Default to false to avoid getting stuck for 50k users
  });
  const [showLoadingSkip, setShowLoadingSkip] = useState(false);

  useEffect(() => {
    if (isLoading) {
      const skipTimer = setTimeout(() => setShowLoadingSkip(true), 3000);
      return () => clearTimeout(skipTimer);
    }
  }, [isLoading]);
  const [error, setError] = useState<string | null>(null);
  const [mixedContentWarning, setMixedContentWarning] = useState<string | null>(null);
  const [lastRemovedChannel, setLastRemovedChannel] = useState<string | null>(
    null,
  );

  const [activeTab, setActiveTab] = useState<"home" | "settings" | "admin">("home");
  const [adminSubTab, setAdminSubTab] = useState<"general" | "categories" | "channels">("general");
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [isFbVerifying, setIsFbVerifying] = useState(false);
  const [pendingChannelToPlay, setPendingChannelToPlay] = useState<Channel | null>(null);
  const [playlistInput, setPlaylistInput] = useState(PLAYLIST_URL);
  const [isSaving, setIsSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<string | null>(null);

  // Admin Panel states
  const [isAdminUnlocked, setIsAdminUnlocked] = useState(false);
  const [adminPasscode, setAdminPasscode] = useState("");
  const [adminStatus, setAdminStatus] = useState<string | null>(null);
  const [adminError, setAdminError] = useState<string | null>(null);
  const [headerClickCount, setHeaderClickCount] = useState(0);
  const [showAdminTrigger, setShowAdminTrigger] = useState(false);
  const headerClickTimerRef = useRef<any>(null);

  // New banner and control states
  const [bannerImageUrl, setBannerImageUrl] = useState("");
  const [bannerInput, setBannerInput] = useState("");
  const [splashScreenUrl, setSplashScreenUrl] = useState(() => {
    try {
      return localStorage.getItem("tuhinext_splash_screen_image_url") || "";
    } catch {
      return "";
    }
  });
  const [splashInput, setSplashInput] = useState(() => {
    try {
      return localStorage.getItem("tuhinext_splash_screen_image_url") || "";
    } catch {
      return "";
    }
  });
  const [appLogoUrl, setAppLogoUrl] = useState(() => {
    try {
      return localStorage.getItem("tuhinext_app_logo") || "";
    } catch {
      return "";
    }
  });
  const [logoInput, setLogoInput] = useState(() => {
    try {
      return localStorage.getItem("tuhinext_app_logo") || "";
    } catch {
      return "";
    }
  });
  const [logoHeight, setLogoHeight] = useState<number>(() => {
    try {
      return Number(localStorage.getItem("tuhinext_logo_height")) || 65;
    } catch {
      return 65;
    }
  });
  const [hideAllChannels, setHideAllChannels] = useState(false);
  const [librarySynced, setLibrarySynced] = useState<boolean>(() => {
    try {
      return localStorage.getItem("tuhinext_library_synced") === "true";
    } catch {
      return false;
    }
  });
  const [showSearch, setShowSearch] = useState(false);
  const [trafficNoticeDismissed, setTrafficNoticeDismissed] = useState(false);
  
  // Navigation View Stack (dashboard | category | player | search)
  const [homeView, setHomeView] = useState<"dashboard" | "category" | "player" | "search">("dashboard");

  // Advanced screen and branding state variables
  const [apkUpdateDirectEnabled, setApkUpdateDirectEnabled] = useState(false);
  const [brandingMobileBanner, setBrandingMobileBanner] = useState("");
  const [brandingTelegramLink, setBrandingTelegramLink] = useState("");
  const [brandingSplashUrlMobile, setBrandingSplashUrlMobile] = useState("");
  const [brandingSplashUrlTv, setBrandingSplashUrlTv] = useState("");
  const [splashMobileInput, setSplashMobileInput] = useState("");
  const [splashPcInput, setSplashPcInput] = useState("");
  const [brandingSplashDuration, setBrandingSplashDuration] = useState(2.0);
  const [brandingHomeLogoUrl, setBrandingHomeLogoUrl] = useState("");

  const [pushNotifTitle, setPushNotifTitle] = useState("");
  const [pushNotifContent, setPushNotifContent] = useState("");
  const [pushNotifImage, setPushNotifImage] = useState("");

  const [fbUnlockEnabled, setFbUnlockEnabled] = useState(false);
  const [fbPageUrl, setFbPageUrl] = useState("https://facebook.com");
  const [fbPageLogo, setFbPageLogo] = useState("");
  const [fbPopupTitle, setFbPopupTitle] = useState("Follow Facebook Page");
  const [fbPopupDesc, setFbPopupDesc] = useState("আমাদের ফেসবুক পেইজে ফলো করে অ্যাপটিতে আবার ফিরে আসুন! সারা জীবনের জন্য আনলক হয়ে যাবে।");
  const [fbUnlockBtnText, setFbUnlockBtnText] = useState("Follow Page");
  const [fbUnlocked, setFbUnlocked] = useState(() => {
    try {
      return localStorage.getItem("tuhinext_fb_unlocked") === "true";
    } catch {
      return false;
    }
  });

  const [onlineUsersCount, setOnlineUsersCount] = useState(1);
  const SESSION_ID = useMemo(() => Math.random().toString(36).substring(2, 12), []);
  const [appNotice, setAppNotice] = useState("");
  const [downloadTitle, setDownloadTitle] = useState("");
  const [downloadLink, setDownloadLink] = useState("");
  const [downloadTitleInput, setDownloadTitleInput] = useState("");
  const [downloadLinkInput, setDownloadLinkInput] = useState("");
  const [isApkUploading, setIsApkUploading] = useState(false);
  const [isLogoUploading, setIsLogoUploading] = useState(false);

  // New channel state
  const [newChanName, setNewChanName] = useState("");
  const [newChanUrl, setNewChanUrl] = useState("");
  const [newChanLogo, setNewChanLogo] = useState("");
  const [newChanCategory, setNewChanCategory] = useState("General");

  // Custom Categories state
  const [customCategories, setCustomCategories] = useState<CustomCategory[]>([]);
  const [newCategoryName, setNewCategoryName] = useState("");
  const [newCategoryLogo, setNewCategoryLogo] = useState("");
  const [newCategoryIsHidden, setNewCategoryIsHidden] = useState(false);

  // Category full edit states
  const [editingCatId, setEditingCatId] = useState<string | null>(null);
  const [editingCatName, setEditingCatName] = useState("");
  const [editingCatLogo, setEditingCatLogo] = useState("");
  const [editingCatIsHidden, setEditingCatIsHidden] = useState(false);

  // Admin filter & edit states
  const [adminSearchQuery, setAdminSearchQuery] = useState("");
  const [selectedChannelIds, setSelectedChannelIds] = useState<Set<string>>(new Set());
  const [deletingChanId, setDeletingChanId] = useState<string | null>(null);

  // Channel full edit states
  const [editingChanId, setEditingChanId] = useState<string | null>(null);
  const [editingChanName, setEditingChanName] = useState("");
  const [editingChanLogo, setEditingChanLogo] = useState("");
  const [editingChanUrl, setEditingChanUrl] = useState("");
  const [editingChanCategory, setEditingChanCategory] = useState("");
  const [editingChanLogoPadding, setEditingChanLogoPadding] = useState<number>(0);

  const getCategoryLogoWithCustom = (categoryName: string): string => {
    const custom = customCategories.find(c => c.name.toLowerCase().trim() === categoryName.toLowerCase().trim());
    if (custom && custom.logo) {
      return custom.logo;
    }
    return getCategoryLogo(categoryName);
  };

  // Easy Auth States
  const [loggedInUser, setLoggedInUser] = useState<any>(() => {
    try {
      const saved = localStorage.getItem("tuhinext_current_user");
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });
  const [authMode, setAuthMode] = useState<"signin" | "signup">("signin");
  const [authEmail, setAuthEmail] = useState("");
  const [authPassword, setAuthPassword] = useState("");
  const [authName, setAuthName] = useState("");
  const [authError, setAuthError] = useState<string | null>(null);
  const [authSuccess, setAuthSuccess] = useState<string | null>(null);
  const isAdmin = loggedInUser?.role === "admin" || loggedInUser?.isAdmin === true || loggedInUser?.email === "rakibulhasantohin@gmail.com" || loggedInUser?.email === "rakibulhasantuhin010@gmail.com";
  const isActuallyAdmin = isAdmin || isAdminUnlocked;
  const [allUsers, setAllUsers] = useState<UserAccount[]>([]);

  // Notification toggles
  const [notifApp, setNotifApp] = useState(() => {
    try {
      return localStorage.getItem("tuhinext_notif_app") !== "false";
    } catch {
      return true;
    }
  });
  const [notifMatch, setNotifMatch] = useState(() => {
    try {
      return localStorage.getItem("tuhinext_notif_match") !== "false";
    } catch {
      return true;
    }
  });
  const [notifChannel, setNotifChannel] = useState(() => {
    try {
      return localStorage.getItem("tuhinext_notif_channel") !== "false";
    } catch {
      return true;
    }
  });

  // Performance toggles
  const [streamQuality, setStreamQuality] = useState(() => {
    try {
      return localStorage.getItem("tuhinext_stream_quality") || "auto";
    } catch {
      return "auto";
    }
  });
  
  const [channelQualities, setChannelQualities] = useState<Record<string, string>>(() => {
    try {
      const cached = localStorage.getItem("tuhinext_channel_qualities");
      return cached ? JSON.parse(cached) : {};
    } catch {
      return {};
    }
  });

  const [detectedActiveQuality, setDetectedActiveQuality] = useState<number | null>(null);

  useEffect(() => {
    if (activeTab !== "admin") {
      setIsAdminUnlocked(false);
      setAdminPasscode("");
    }
  }, [activeTab]);

  const fetchEverythingOnce = async (force = false) => {
    try {
      // High Traffic Optimization: Only fetch from Firestore if cache is older than 6 hours
      // OR if the user is an admin (who needs latest data)
      const lastSync = localStorage.getItem("tuhinext_last_sync_time");
      const cachedChannels = localStorage.getItem("tuhinext_channels");
      const cachedCats = localStorage.getItem("tuhinext_categories");

      if (!force && !isAdmin && lastSync && cachedChannels && Date.now() - parseInt(lastSync) < 21600000) {
        // Load from cache and skip network
        setChannels(JSON.parse(cachedChannels));
        if (cachedCats) {
          try {
            const parsed = JSON.parse(cachedCats);
            const normalized = parsed.map((c: any) => {
              if (typeof c === "string") {
                return { id: `cat-${c.toLowerCase().replace(/[^a-z0-9]/g, "-")}`, name: c, logo: "", isHidden: false };
              }
              return {
                id: c.id || `cat-${(c.name || "").toLowerCase().replace(/[^a-z0-9]/g, "-")}`,
                name: c.name || "",
                logo: c.logo || "",
                isHidden: !!c.isHidden
              };
            });
            setCustomCategories(normalized);
          } catch {
            setCustomCategories([]);
          }
        }
        
        // Also load other settings from cache
        setBannerImageUrl(localStorage.getItem("tuhinext_banner_image_url") || "");
        setAppLogoUrl(localStorage.getItem("tuhinext_app_logo") || "");
        setLogoHeight(Number(localStorage.getItem("tuhinext_logo_height")) || 65);
        setHideAllChannels(localStorage.getItem("tuhinext_hide_all_channels") === "true");
        
        setIsLoading(false);
        return;
      }

      // Fetch Settings
      const settingsSnap = await getDocs(collection(db, "settings"));
      settingsSnap.forEach((doc) => {
        const data = doc.data();
        const key = doc.id;
        switch (key) {
          case "categories":
            if (Array.isArray(data.value)) {
              const normalized = data.value.map((c: any) => {
                if (typeof c === "string") {
                  return { id: `cat-${c.toLowerCase().replace(/[^a-z0-9]/g, "-")}`, name: c, logo: "", isHidden: false };
                }
                return {
                  id: c.id || `cat-${(c.name || "").toLowerCase().replace(/[^a-z0-9]/g, "-")}`,
                  name: c.name || "",
                  logo: c.logo || "",
                  isHidden: !!c.isHidden
                };
              });
              setCustomCategories(normalized);
              localStorage.setItem("tuhinext_categories", JSON.stringify(normalized));
            }
            break;
          case "banner_image_url":
            setBannerImageUrl(data.value || "");
            localStorage.setItem("tuhinext_banner_image_url", data.value || "");
            break;
          case "splash_screen_image_url":
            setSplashScreenUrl(data.value || "");
            setSplashInput(data.value || "");
            localStorage.setItem("tuhinext_splash_screen_image_url", data.value || "");
            break;
          case "app_logo":
            setAppLogoUrl(data.value || "");
            localStorage.setItem("tuhinext_app_logo", data.value || "");
            break;
          case "app_logo_height":
            setLogoHeight(Number(data.value) || 65);
            localStorage.setItem("tuhinext_logo_height", data.value || "65");
            break;
          case "hide_all_channels":
            setHideAllChannels(data.value === "true");
            localStorage.setItem("tuhinext_hide_all_channels", data.value || "false");
            break;
          case "app_download_title":
            setDownloadTitle(data.value || "");
            setDownloadTitleInput(data.value || "");
            break;
          case "app_download_link":
            setDownloadLink(data.value || "");
            setDownloadLinkInput(data.value || "");
            break;
          case "app_notice":
            setAppNotice(data.value || "");
            break;
          case "apk_update_direct_enabled":
            setApkUpdateDirectEnabled(data.value === "true");
            break;
          case "branding_mobile_banner":
            setBrandingMobileBanner(data.value || "");
            break;
          case "branding_telegram_link":
            setBrandingTelegramLink(data.value || "");
            break;
          case "branding_splash_url_mobile":
            setBrandingSplashUrlMobile(data.value || "");
            setSplashMobileInput(data.value || "");
            break;
          case "branding_splash_url_tv":
            setBrandingSplashUrlTv(data.value || "");
            setSplashPcInput(data.value || "");
            break;
          case "branding_splash_duration":
            setBrandingSplashDuration(Number(data.value) || 2.0);
            break;
          case "branding_home_logo_url":
            setBrandingHomeLogoUrl(data.value || "");
            break;
          case "fb_unlock_enabled":
            setFbUnlockEnabled(data.value === "true");
            break;
          case "fb_page_url":
            setFbPageUrl(data.value || "https://facebook.com");
            break;
          case "fb_page_logo":
            setFbPageLogo(data.value || "");
            break;
          case "fb_popup_title":
            setFbPopupTitle(data.value || "Follow Facebook Page");
            break;
          case "fb_popup_desc":
            setFbPopupDesc(data.value || "আমাদের ফেসবুক পেইজে ফলো করে অ্যাপটিতে আবার ফিরে আসুন! সারা জীবনের জন্য আনলক হয়ে যাবে।");
            break;
          case "fb_unlock_btn_text":
            setFbUnlockBtnText(data.value || "Follow Page");
            break;
        }
      });

      const snap = await getDoc(doc(db, "settings", "custom_channels"));
      if (snap.exists() && snap.data().value) {
        try {
          const parsed = JSON.parse(snap.data().value);
          if (Array.isArray(parsed) && parsed.length > 0) {
            setChannels(parsed);
            localStorage.setItem("tuhinext_channels", snap.data().value);
          } else {
            throw new Error("Invalid custom channels data");
          }
        } catch (e) {
          // fallback to individual channels collection if JSON is corrupted
          const colSnap = await getDocs(collection(db, "channels"));
          const channelList: Channel[] = [];
          colSnap.forEach((doc) => {
            channelList.push({ id: doc.id, ...doc.data() } as Channel);
          });
          channelList.sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
          if (channelList.length > 0) {
            setChannels(channelList);
            localStorage.setItem("tuhinext_channels", JSON.stringify(channelList));
          }
        }
      } else {
        // fallback to individual channels collection
        const colSnap = await getDocs(collection(db, "channels"));
        const channelList: Channel[] = [];
        colSnap.forEach((doc) => {
          channelList.push({ id: doc.id, ...doc.data() } as Channel);
        });
        channelList.sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
        if (channelList.length > 0) {
          setChannels(channelList);
          localStorage.setItem("tuhinext_channels", JSON.stringify(channelList));
        } else {
          // If Firestore is completely empty, try one-time fetch from M3U if we have a URL
          const urlSnap = await getDoc(doc(db, "settings", "playlist_url"));
          if (urlSnap.exists() && urlSnap.data().value) {
             fetchPlaylist(true); 
          }
        }
      }
      localStorage.setItem("tuhinext_last_sync_time", Date.now().toString());
    } catch (err: any) {
      if (err.code === 'resource-exhausted') {
        console.warn("Firestore Quota Exceeded. Using cache.");
        sessionStorage.setItem("firestore_quota_exhausted", "true");
        // On quota failure, if we have cache, use it immediately
        const cached = localStorage.getItem("tuhinext_channels");
        if (cached) {
          setChannels(JSON.parse(cached));
        }
      } else {
        console.warn("One-time fetch failed:", err);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const triggerGlobalSync = async () => {
    try {
      await setDoc(doc(db, "settings", "sync_status"), { version: Date.now() }, { merge: true });
    } catch (e) {
      console.warn("Failed to trigger global sync:", e);
    }
  };

  const [bufferTime, setBufferTime] = useState(() => {
    return localStorage.getItem("tuhinext_buffer_time") || "standard";
  });

  // TV Plus states
  const [showPlusCheckout, setShowPlusCheckout] = useState(false);
  const [plusMethod, setPlusMethod] = useState<"bkash" | "nagad" | "rocket">("bkash");
  const [plusPhone, setPlusPhone] = useState("");
  const [plusTransaction, setPlusTransaction] = useState("");
  const [plusStatus, setPlusStatus] = useState<string | null>(null);
  const [plusError, setPlusError] = useState<string | null>(null);
  const [isPremiumInstalled, setIsPremiumInstalled] = useState(() => {
    return localStorage.getItem("tuhinext_tvplus_active") === "true";
  });

  useEffect(() => {
    const splashTimer = setTimeout(() => {
      setShowSplash(false);
    }, 2000);
    return () => clearTimeout(splashTimer);
  }, []);

  useEffect(() => {
    // One-time cleanup of the old broken TinyURL if it still exists in localStorage
    const oldUrl = "https://tinyurl.com/kbtvproBDXI";
    const currentUrl = localStorage.getItem("tuhinext_playlist_url");
    if (currentUrl === oldUrl) {
      console.log("Cleaning up old broken TinyURL...");
      localStorage.removeItem("tuhinext_playlist_url");
      localStorage.removeItem("tuhinext_channels");
      // Also clear it in the DB to prevent sync-back
      const clearDb = async () => {
        try {
          await setDoc(doc(db, "settings", "playlist_url"), { value: "" }, { merge: true });
        } catch (e) {}
      };
      clearDb();
    }
  }, []);

  useEffect(() => {
    // 1. Load from cache immediately for near-instant boot
    const cachedChannels = localStorage.getItem("tuhinext_channels");
    if (cachedChannels) {
      try {
        const parsed = JSON.parse(cachedChannels);
        if (parsed.length > 0) {
          setChannels(parsed);
        }
      } catch {}
    }

    // Safety timeout: Ensure loading screen doesn't persist forever
    const loadingTimeout = setTimeout(() => {
      setIsLoading(false);
    }, 5000); // reduced to 5s

    // Real-time updates enabled for EVERYONE using Quota-Saving Sync Status snapshot
    let unsubSync: () => void = () => {};

    // Fetch once on boot (utilizes 6h cache unless admin or force-load)
    fetchEverythingOnce();

    // Listen only to the single "sync_status" document to save quota for 100k+ users
    unsubSync = onSnapshot(doc(db, "settings", "sync_status"), (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        const remoteVersion = String(data.version || "");
        const localVersion = localStorage.getItem("tuhinext_sync_version") || "";
        
        if (remoteVersion && remoteVersion !== localVersion) {
          console.log("Remote changes detected! Version:", remoteVersion);
          localStorage.setItem("tuhinext_sync_version", remoteVersion);
          // Force a background refresh of channels and settings
          fetchEverythingOnce(true);
        }
      } else {
        // Fallback: If sync_status doesn't exist yet, we initialize it
        if (isAdmin) {
          triggerGlobalSync();
        }
      }
      setIsLoading(false);
      clearTimeout(loadingTimeout);
    }, (err: any) => {
      console.warn("Quota or Network Error in sync snapshot:", err);
      if (err.code === 'resource-exhausted') {
        sessionStorage.setItem("firestore_quota_exhausted", "true");
      }
      setIsLoading(false);
      clearTimeout(loadingTimeout);
    });

    return () => {
      unsubSync();
      clearTimeout(loadingTimeout);
    };
  }, [isAdmin]);

  // Automatic migration: Move channels in "General" category (or empty) to "FIFA",
  // and ensure "FIFA" category exists with a custom logo.
  useEffect(() => {
    if (channels && channels.length > 0) {
      const hasGeneral = channels.some(ch => (ch.category || "General").toLowerCase() === "general");
      const hasFifa = customCategories.some(c => c.name.toLowerCase() === "fifa");
      let updatedCats = [...customCategories];
      let catsChanged = false;

      if (!hasFifa) {
        updatedCats.push({
          id: "cat-fifa",
          name: "FIFA",
          logo: "https://digitalsynopsis.com/wp-content/uploads/2018/06/fifa-world-cup-logos-usa-mexico-canada-2026.jpg",
          isHidden: false
        });
        catsChanged = true;
      }

      if (hasGeneral || catsChanged) {
        const updatedChans = channels.map(ch => {
          const cat = ch.category || "General";
          if (cat.toLowerCase() === "general") {
            return { ...ch, category: "FIFA" };
          }
          return ch;
        });

        // Update local React state and cache first for instant feedback
        if (hasGeneral) {
          setChannels(updatedChans);
          localStorage.setItem("tuhinext_channels", JSON.stringify(updatedChans));
        }
        if (catsChanged) {
          setCustomCategories(updatedCats);
          localStorage.setItem("tuhinext_categories", JSON.stringify(updatedCats));
        }

        // Save back to Firestore and trigger real-time sync for everyone
        const saveMigration = async () => {
          try {
            if (hasGeneral) {
              await setDoc(doc(db, "settings", "custom_channels"), { value: JSON.stringify(updatedChans) }, { merge: true });
            }
            if (catsChanged) {
              await setDoc(doc(db, "settings", "categories"), { value: updatedCats }, { merge: true });
            }
            await triggerGlobalSync();
            console.log("Successfully migrated General channels to FIFA, and ensured FIFA category is configured.");
          } catch (e) {
            console.warn("Error saving automatic migration to Firestore:", e);
          }
        };
        saveMigration();
      }
    }
  }, [channels, customCategories]);


  useEffect(() => {
    // Initial fetch from M3U if provided, otherwise reliance on Firestore is primary
    const init = async () => {
      // Owner/Admin auto-fetch
      if (!isAdmin) return; 
      try {
        const docSnap = await getDoc(doc(db, "settings", "playlist_url"));
        if (docSnap.exists() && docSnap.data().value) {
          fetchPlaylist(true); // Re-enable auto-fetch for admins to sync URL
        }
      } catch (e) {}
    };
    init();
  }, [isAdmin]);

  useEffect(() => {
    // Presence System: Track unique sessions in Firestore
    const presenceRef = doc(db, 'live_users', SESSION_ID);

    const updatePresence = async () => {
      if (sessionStorage.getItem("firestore_quota_exhausted") === "true") return;
      
      // Optimization: Only 5% of users update presence to stay within free tier
      // but still provide a statistically relevant sample
      if (!isAdmin && Math.random() > 0.05) return;

      try {
        await setDoc(presenceRef, { 
          lastActive: serverTimestamp(),
          isAdmin: isAdmin
        });
      } catch (e: any) {
        if (e.code === 'resource-exhausted') {
          sessionStorage.setItem("firestore_quota_exhausted", "true");
        }
      }
    };

    const removePresence = async () => {
      if (sessionStorage.getItem("firestore_quota_exhausted") === "true") return;
      try {
        await deleteDoc(presenceRef);
      } catch (e) {}
    };

    updatePresence();
    const heartbeatInterval = setInterval(updatePresence, 60000); // 1 min heartbeat

    const fetchCount = async () => {
      if (document.visibilityState !== 'visible') return;
      
      if (sessionStorage.getItem("firestore_quota_exhausted") === "true") {
        // Fallback: Simulate active users with jitter
        setOnlineUsersCount(prev => Math.max(12, prev + (Math.floor(Math.random() * 5) - 2)));
        return;
      }
      
      try {
        // Find users active in the last 3 minutes
        const activeThreshold = Date.now() - 180000;
        const q = query(collection(db, 'live_users'), where('lastActive', '>', activeThreshold));
        const snap = await getCountFromServer(q);
        const count = snap.data().count;
        
        // Extrapolate count based on 5% sampling for regular users
        // Since admins (usually 1 or few) always write, we subtract them if needed or just scale
        const estimated = Math.max(1, Math.floor(count * 20)); 
        setOnlineUsersCount(estimated + (Math.floor(Math.random() * 3) - 1));
      } catch (e: any) {
        if (e.code === 'resource-exhausted') {
          sessionStorage.setItem("firestore_quota_exhausted", "true");
        }
        setOnlineUsersCount(prev => Math.max(12, prev + (Math.floor(Math.random() * 3) - 1)));
      }
    };

    fetchCount();
    const countInterval = setInterval(fetchCount, 45000); 

    window.addEventListener('beforeunload', removePresence);

    return () => {
      clearInterval(heartbeatInterval);
      clearInterval(countInterval);
      window.removeEventListener('beforeunload', removePresence);
      removePresence();
    };
  }, [SESSION_ID, isAdmin]);

  // Autoplay off: channels do not automatically play when entering the app as requested. Use can select a channel manually to start playback.

  const suggestedChannels = useMemo(() => {
    if (!activeChannel || channels.length === 0) return [];

    // Filter channels of same category, exclude current one
    const sameCategory = channels.filter(
      (c) => c.category === activeChannel.category && c.id !== activeChannel.id,
    );

    // Filter other channels
    const others = channels.filter(
      (c) => c.category !== activeChannel.category && c.id !== activeChannel.id,
    );

    // Shuffle and take a mix
    const shuffle = (array: Channel[]) =>
      [...array].sort(() => Math.random() - 0.5);

    const suggestions = [...shuffle(sameCategory), ...shuffle(others)].slice(
      0,
      12,
    );
    return suggestions;
  }, [activeChannel, channels]);

  const headerSuggestions = useMemo(() => {
    if (!headerSearchQuery || channels.length === 0 || hideAllChannels) return [];
    return channels
      .filter((c) =>
        !c.isHidden &&
        c.name.toLowerCase().startsWith(headerSearchQuery.toLowerCase()),
      )
      .slice(0, 5);
  }, [headerSearchQuery, channels, hideAllChannels]);

  const searchInputRef = useRef<HTMLInputElement>(null);
  const playerRef = useRef<Player | null>(null);
  const mainContentRef = useRef<HTMLDivElement>(null);

  const [showHeader, setShowHeader] = useState(true);
  const lastScrollY = useRef(0);

  useEffect(() => {
    const handleScroll = () => {
      const container = mainContentRef.current;
      if (!container) return;
      const currentScrollY = container.scrollTop || 0;
      
      // ignore tiny scroll movements to key experience stable
      if (Math.abs(currentScrollY - lastScrollY.current) < 8) return;

      if (currentScrollY > lastScrollY.current) {
        // Scrolled Down (content goes up, scrollbar goes down): hide header
        if (currentScrollY > 60) {
          setShowHeader(false);
        }
      } else {
        // Scrolled Up (content goes down, scrollbar goes up): show header
        setShowHeader(true);
      }
      
      // Always show when very close to top
      if (currentScrollY < 15) {
        setShowHeader(true);
      }

      lastScrollY.current = currentScrollY;
    };

    const container = mainContentRef.current;
    if (container) {
      container.addEventListener("scroll", handleScroll, { passive: true });
    }
    return () => {
      if (container) {
        container.removeEventListener("scroll", handleScroll);
      }
    };
  }, []);

  // Always reveal header when user switches navigation tabs
  useEffect(() => {
    setShowHeader(true);
  }, [activeTab]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "k") {
        e.preventDefault();
        searchInputRef.current?.focus();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  const fetchPlaylist = async (isBackground = false, forceRefreshFromUrl = false) => {
    if (!isBackground) {
      setIsLoading(true);
      setError(null);
    }

    const currentUrl = localStorage.getItem("tuhinext_playlist_url") || PLAYLIST_URL;

    if (!currentUrl) {
      console.log("No playlist URL defined. Using default channels.");
      setChannels(defaultChannels);
      localStorage.setItem("tuhinext_channels", JSON.stringify(defaultChannels));
      if (!isBackground) setIsLoading(false);
      return;
    }

    if (!forceRefreshFromUrl) {
      // Check if we have custom_channels in DB FIRST. If we do, we SKIP fetching M3U!
      // This ensures admin's hidden/deleted channels permanently persist.
      try {
        const docSnap = await getDoc(doc(db, "settings", "custom_channels"));
        const customChannelsData = docSnap.exists() ? docSnap.data() : null;

        if (customChannelsData?.value) {
          const parsed = JSON.parse(customChannelsData.value);
          if (Array.isArray(parsed) && parsed.length > 0) {
            console.log("Custom channels exist in DB. Skipping M3U fetch.");
            setChannels(parsed);
            localStorage.setItem("tuhinext_channels", customChannelsData.value);
            if (!isBackground) setIsLoading(false);
            return;
          }
        }
      } catch (e) {
        console.warn("Could not check custom channels:", e);
      }
    }

    try {
      let finalUrl = localStorage.getItem("tuhinext_playlist_url") || PLAYLIST_URL;

      // Try to fetch custom playlist URL from Firestore if not in localStorage to sync devices
      if (!finalUrl) {
        try {
          const docSnap = await getDoc(doc(db, "settings", "playlist_url"));
          const data = docSnap.exists() ? docSnap.data() : null;

          if (data?.value) {
            finalUrl = data.value;
            localStorage.setItem("tuhinext_playlist_url", data.value);
            console.log("Using playlist from Firestore:", finalUrl);
          }
        } catch (e) {
          console.log("Firestore check skipped or failed:", e);
        }
      }

      if (!finalUrl) {
        console.log("No playlist URL found after check. Using default channels.");
        setChannels(defaultChannels);
        localStorage.setItem("tuhinext_channels", JSON.stringify(defaultChannels));
        if (!isBackground) setIsLoading(false);
        return;
      }

      const response = await fetch(finalUrl);
      if (!response.ok) throw new Error("Playlist fetch failed");
      const text = await response.text();

      const parsedChannels: Channel[] = [];
      const lines = text.split("\n");
      let currentChannel: Partial<Channel> = {};

      lines.forEach((line, index) => {
        line = line.trim();
        if (
          line.toUpperCase().startsWith("#EXTINF") ||
          line.toUpperCase().startsWith("# EXTINF")
        ) {
          const nameMatch = line.match(/,(.*)$/);
          const logoMatch = line.match(/tvg-logo=["'](.*?)["']/i);
          const groupMatch = line.match(/group-title=["'](.*?)["']/i);

          currentChannel = {
            id: `ch-${index}`,
            name: nameMatch ? nameMatch[1].trim() : "Unknown Channel",
            logo: logoMatch
              ? logoMatch[1]
              : DEFAULT_CHANNEL_LOGO,
            category: groupMatch ? groupMatch[1] : "General",
            isOnline: true,
          };
        } else if (line.startsWith("http")) {
          if (currentChannel.name) {
            parsedChannels.push({ ...currentChannel, url: line } as Channel);
            currentChannel = {};
          }
        }
      });

      const getPriority = (ch: Channel) => {
        const name = ch.name.toLowerCase();
        const cat = ch.category.toLowerCase();

        // Priority 1: Bangladesh
        if (
          cat.includes("bangla") ||
          name.includes("bangla") ||
          cat.includes("bd") ||
          name.includes("bd") ||
          cat.includes("bangladesh") ||
          name.includes("bangladesh")
        ) {
          return 1;
        }
        // Priority 2: India
        if (
          cat.includes("india") ||
          name.includes("india") ||
          cat.includes("sony") ||
          cat.includes("star") ||
          cat.includes("zee") ||
          cat.includes("colors") ||
          cat.includes("sun nxt")
        ) {
          return 2;
        }
        // Priority 3: Pakistan
        if (
          cat.includes("pakistan") ||
          name.includes("pakistan") ||
          cat.includes("pak") ||
          name.includes("pak")
        ) {
          return 3;
        }
        return 4;
      };

      const sortedChannels = parsedChannels.sort((a, b) => {
        const pA = getPriority(a);
        const pB = getPriority(b);

        if (pA !== pB) return pA - pB;

        const hasALogo = a.logo !== DEFAULT_CHANNEL_LOGO;
        const hasBLogo = b.logo !== DEFAULT_CHANNEL_LOGO;

        if (hasALogo && !hasBLogo) return -1;
        if (!hasALogo && hasBLogo) return 1;

        return a.name.localeCompare(b.name);
      });

      // Save to localStorage
      try {
        localStorage.setItem("tuhinext_channels", JSON.stringify(sortedChannels));
      } catch (e) {
        console.warn("localStorage quota exceeded, couldn't write channels:", e);
      }
      setChannels(sortedChannels);
    } catch (err: any) {
      if (!isBackground) {
        console.error("Playlist fetch failed, falling back to default channels:", err);
        
        // If we have default channels, use them and clear the error
        if (defaultChannels && defaultChannels.length > 0) {
          setChannels(defaultChannels);
          localStorage.setItem("tuhinext_channels", JSON.stringify(defaultChannels));
          setError(null);
        } else {
          // If no defaults or current channels, show a descriptive error
          const msg = err?.message || String(err);
          if (msg.includes("Failed to fetch") || msg.includes("fetch failed") || msg.includes("NetworkError")) {
            setError("Network Error: Could not reach the playlist server. This could be due to CORS restrictions or no internet connection.");
          } else {
            setError(`Failed to load playlist: ${msg}`);
          }
        }
      }
      console.error(err);
    } finally {
      if (!isBackground) {
        setIsLoading(false);
      }
    }
  };

  const handleSaveSettings = async (url: string) => {
    setIsSaving(true);
    setSaveStatus(null);
    try {
      const trimmed = url.trim();
      if (!trimmed) {
        setSaveStatus("Playlist URL cannot be empty.");
        return;
      }
      
      // Save locally
      localStorage.setItem("tuhinext_playlist_url", trimmed);
      
      // Save globally in Firebase settings
      try {
        await setDoc(doc(db, "settings", "playlist_url"), { value: trimmed }, { merge: true });
      } catch (sbE) {
        console.warn("Firebase upsert failed or is offline:", sbE);
      }

      setSaveStatus("Settings saved successfully! Reloading playlist...");
      
      // Clear current channels cache to force refresh
      localStorage.removeItem("tuhinext_channels");
      
      try {
        await deleteDoc(doc(db, "settings", "custom_channels"));
      } catch (e) {
        console.warn("Could not delete custom channels fallback:", e);
      }
      
      // Load the channels from the new playlist and sync to cloud
      await fetchPlaylist(false, true);
      
      // Auto-trigger cloud sync for the new data
      setTimeout(async () => {
        const cached = localStorage.getItem("tuhinext_channels");
        if (cached) {
          const parsed = JSON.parse(cached);
          if (Array.isArray(parsed) && parsed.length > 0) {
            setAdminStatus("Broadcasting new playlist data to cloud nodes...");
            const batch = writeBatch(db);
            parsed.forEach((ch: any) => {
              batch.set(doc(db, "channels", ch.id || `ch-${Math.random().toString(36).substr(2, 9)}`), ch);
            });
            await batch.commit();
            setAdminStatus("Cloud synchronization complete!");
          }
        }
      }, 2000);
      
      setTimeout(() => {
        setSaveStatus(null);
      }, 3500);
    } catch (e) {
      console.error(e);
      setSaveStatus("Saved locally. Could not update database.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleAdminDeleteChannel = async (channelId: string) => {
    try {
      setAdminStatus("Removing channel locally...");
      // Update custom_channels list instantly
      const updatedChannels = channels.filter(c => c.id !== channelId);
      setChannels(updatedChannels);
      localStorage.setItem("tuhinext_channels", JSON.stringify(updatedChannels));
      localStorage.setItem("tuhinext_library_synced", "true");

      if (activeChannel?.id === channelId) {
        setActiveChannel(null);
      }

      setAdminStatus("Removing channel from Cloud Firestore...");
      await Promise.all([
        setDoc(doc(db, "settings", "library_synced"), { value: "true" }, { merge: true }),
        deleteDoc(doc(db, "channels", channelId)),
        setDoc(doc(db, "settings", "custom_channels"), { value: JSON.stringify(updatedChannels) }, { merge: true }),
        triggerGlobalSync()
      ]);

      setAdminStatus("Channel removed permanently from server database!");
      setTimeout(() => setAdminStatus(null), 3000);
    } catch (e) {
      console.error(e);
      setAdminError("Failed to delete from cloud database.");
      setTimeout(() => setAdminError(null), 3000);
    }
  };

  const handleAdminAddChannel = async (name: string, url: string, logo: string, category: string, logoPadding?: number) => {
    const trimmedName = name.trim();
    const trimmedUrl = url.trim();
    if (!trimmedName || !trimmedUrl) {
      setAdminError("Name and stream URL are required fields!");
      return;
    }
    setAdminError(null);
    try {
      const id = `ch-custom-${Date.now()}`;
      const newChan: Channel = {
        id,
        name: trimmedName,
        url: trimmedUrl,
        logo: logo.trim() || DEFAULT_CHANNEL_LOGO,
        category: category.trim() || "General",
        isOnline: true,
        order: channels.length,
        logoPadding: logoPadding || 0,
      };

      setAdminStatus("Updating local state and cache...");
      // Instantly update client state and cache for immediate feedback
      const updatedChannels = [...channels, newChan];
      setChannels(updatedChannels);
      localStorage.setItem("tuhinext_channels", JSON.stringify(updatedChannels));
      localStorage.setItem("tuhinext_library_synced", "true");

      setAdminStatus("Uploading new channel to Firestore...");
      // Perform background saves
      await Promise.all([
        setDoc(doc(db, "settings", "library_synced"), { value: "true" }, { merge: true }),
        setDoc(doc(db, "channels", id), newChan),
        setDoc(doc(db, "settings", "custom_channels"), { value: JSON.stringify(updatedChannels) }, { merge: true }),
        triggerGlobalSync()
      ]);

      // Reset fields
      setEditingChanName("");
      setEditingChanUrl("");
      setEditingChanLogo("");
      setEditingChanCategory("");
      setEditingChanLogoPadding(0);

      setAdminStatus("Channel permanently added to database!");
      setTimeout(() => setAdminStatus(null), 3000);
    } catch (e) {
      console.error(e);
      setAdminError("Cloud database failed to sync.");
      setTimeout(() => setAdminError(null), 3000);
    }
  };

  const handleAdminUpdateChannel = async (channelId: string, updatedFields: Partial<Channel>) => {
    try {
      setAdminStatus("Applying changes locally...");
      // Instantly update client state and cache
      const updatedChannels = channels.map(c => c.id === channelId ? { ...c, ...updatedFields } : c);
      setChannels(updatedChannels);
      localStorage.setItem("tuhinext_channels", JSON.stringify(updatedChannels));

      setAdminStatus("Syncing update with Cloud Firestore...");
      // Use setDoc with merge instead of updateDoc for robustness
      await Promise.all([
        setDoc(doc(db, "channels", channelId), updatedFields, { merge: true }),
        setDoc(doc(db, "settings", "custom_channels"), { value: JSON.stringify(updatedChannels) }, { merge: true }),
        triggerGlobalSync()
      ]);

      setAdminStatus("Channel updated in cloud database!");
      setTimeout(() => setAdminStatus(null), 3000);
    } catch (e) {
      console.error(e);
      setAdminError("Cloud database offline or update failed.");
      setTimeout(() => setAdminError(null), 3000);
    }
  };

  const handleMoveChannel = async (channelId: string, direction: 'up' | 'down') => {
    const index = channels.findIndex(c => c.id === channelId);
    if (index === -1) return;

    const newIndex = direction === 'up' ? index - 1 : index + 1;
    if (newIndex < 0 || newIndex >= channels.length) return;

    const currentChannel = channels[index];
    const targetChannel = channels[newIndex];

    // Ensure all involved channels have an order
    const currentOrder = currentChannel.order ?? index;
    const targetOrder = targetChannel.order ?? newIndex;

    try {
      setAdminStatus(`Moving ${direction}...`);
      const batch = writeBatch(db);
      
      // We swap orders. If target has same order as current (shouldn't happen), we differentiate.
      let finalTargetOrder = currentOrder;
      let finalCurrentOrder = targetOrder;
      
      if (finalTargetOrder === finalCurrentOrder) {
        finalCurrentOrder = direction === 'up' ? finalCurrentOrder - 1 : finalCurrentOrder + 1;
      }

      batch.update(doc(db, "channels", currentChannel.id), { order: finalCurrentOrder });
      batch.update(doc(db, "channels", targetChannel.id), { order: finalTargetOrder });
      
      // Update custom_channels list and trigger global sync status in batch
      const updatedChannels = [...channels];
      updatedChannels[index] = { ...currentChannel, order: finalCurrentOrder };
      updatedChannels[newIndex] = { ...targetChannel, order: finalTargetOrder };
      updatedChannels.sort((a, b) => (a.order ?? 0) - (b.order ?? 0));

      batch.set(doc(db, "settings", "custom_channels"), { value: JSON.stringify(updatedChannels) }, { merge: true });
      batch.set(doc(db, "settings", "sync_status"), { version: Date.now() }, { merge: true });

      await batch.commit();
      setAdminStatus("Position updated successfully!");
      setTimeout(() => setAdminStatus(null), 2000);
    } catch (e) {
      console.error("Move error:", e);
      setAdminError("Failed to reorder channel.");
      setTimeout(() => setAdminError(null), 3000);
    }
  };
 
  const handleBulkHide = async (hide: boolean) => {
    try {
      setAdminStatus(`Bulk ${hide ? 'hiding' : 'unhiding'} selected channels in cloud...`);
      const batch = writeBatch(db);
      selectedChannelIds.forEach(id => {
        batch.update(doc(db, "channels", id), { isHidden: hide });
      });

      // Update custom_channels list and trigger global sync status in batch
      const updatedChannels = channels.map(c => selectedChannelIds.has(c.id) ? { ...c, isHidden: hide } : c);
      batch.set(doc(db, "settings", "custom_channels"), { value: JSON.stringify(updatedChannels) }, { merge: true });
      batch.set(doc(db, "settings", "sync_status"), { version: Date.now() }, { merge: true });

      await batch.commit();
      
      setSelectedChannelIds(new Set());
      setAdminStatus(`Bulk ${hide ? "hide" : "unhide"} successful!`);
      setTimeout(() => setAdminStatus(null), 3000);
    } catch (e) {
      console.error(e);
      setAdminError("Bulk action failed. Server database error.");
      setTimeout(() => setAdminError(null), 3000);
    }
  };
 
  const handleBulkDelete = async () => {
    if (!window.confirm(`Are you sure you want to PERMANENTLY delete ${selectedChannelIds.size} channels from the cloud? This action cannot be undone.`)) return;
    try {
      setAdminStatus(`Bulk deleting ${selectedChannelIds.size} channels from cloud...`);
      localStorage.setItem("tuhinext_library_synced", "true");
      await setDoc(doc(db, "settings", "library_synced"), { value: "true" }, { merge: true });
      const batch = writeBatch(db);
      selectedChannelIds.forEach(id => {
        batch.delete(doc(db, "channels", id));
      });

      // Update custom_channels list and trigger global sync status in batch
      const updatedChannels = channels.filter(c => !selectedChannelIds.has(c.id));
      batch.set(doc(db, "settings", "custom_channels"), { value: JSON.stringify(updatedChannels) }, { merge: true });
      batch.set(doc(db, "settings", "sync_status"), { version: Date.now() }, { merge: true });

      await batch.commit();
      
      setSelectedChannelIds(new Set());
      setAdminStatus("Selected channels permanently deleted!");
      setTimeout(() => setAdminStatus(null), 3000);
    } catch (e) {
      console.error(e);
      setAdminError("Bulk delete failed. Server database error.");
      setTimeout(() => setAdminError(null), 3000);
    }
  };

  const handlePurgeAllData = async () => {
    if (!window.confirm("CRITICAL ACTION: This will PERMANENTLY delete ALL channels and categories from the cloud and reset your playlist URL. Continue?")) return;
    
    try {
      setIsSaving(true);
      setAdminStatus("Initiating full cloud purge...");
      
      // 1. Clear locally
      localStorage.removeItem("tuhinext_playlist_url");
      localStorage.removeItem("tuhinext_channels");
      setPlaylistInput("");
      setChannels([]);
      
      // 2. Delete all channel docs
      const batch = writeBatch(db);
      channels.forEach(ch => {
        batch.delete(doc(db, "channels", ch.id));
      });
      
      // 3. Clear settings
      batch.set(doc(db, "settings", "playlist_url"), { value: "" });
      batch.delete(doc(db, "settings", "custom_channels"));
      
      await batch.commit();
      
      setAdminStatus("Cloud database wiped successfully!");
      setTimeout(() => setAdminStatus(null), 4000);
    } catch (e) {
      console.error(e);
      setAdminError("Purge failed. Database access error.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      const allIds = adminFilteredChannels.slice(0, 100).map(ch => ch.id);
      setSelectedChannelIds(new Set(allIds));
    } else {
      setSelectedChannelIds(new Set());
    }
  };

  const handleSyncToCloud = async () => {
    if (channels.length === 0) return;
    try {
      setAdminStatus(`Syncing ${channels.length} channels to Cloud Firestore...`);
      localStorage.setItem("tuhinext_library_synced", "true");
      await setDoc(doc(db, "settings", "library_synced"), { value: "true" }, { merge: true });
      const batch = writeBatch(db);
      channels.forEach((ch, idx) => {
        const orderValue = ch.order !== undefined ? ch.order : idx;
        batch.set(doc(db, "channels", ch.id), { ...ch, order: orderValue });
      });
      // Save stringified custom channels in settings to save 99% reads
      batch.set(doc(db, "settings", "custom_channels"), { value: JSON.stringify(channels) }, { merge: true });
      // Trigger global sync status version update
      batch.set(doc(db, "settings", "sync_status"), { version: Date.now() }, { merge: true });
      await batch.commit();
      setAdminStatus("All channels synced to cloud successfully!");
      setTimeout(() => setAdminStatus(null), 3000);
    } catch (e) {
      console.error(e);
      setAdminError("Cloud sync failed.");
      setTimeout(() => setAdminError(null), 3000);
    }
  };
  const handleSaveBannerImageUrl = async (url: string) => {
    try {
      setBannerInput(url);
      localStorage.setItem("tuhinext_banner_image_url", url);
      await setDoc(doc(db, "settings", "banner_image_url"), { value: url }, { merge: true });
      await triggerGlobalSync();
      setAdminStatus("Banner image saved and synced globally!");
      setTimeout(() => setAdminStatus(null), 3000);
    } catch (e) {
      console.warn("Error saving banner:", e);
      setAdminStatus("Banner saved locally, database error.");
      setTimeout(() => setAdminStatus(null), 3000);
    }
  };

  const handleBannerFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setAdminStatus("Processing banner upload...");
      const reader = new FileReader();
      reader.onload = async (event) => {
        const result = event.target?.result as string;
        await handleSaveBannerImageUrl(result);
      };
      reader.readAsDataURL(file);
    } catch (err) {
      setAdminError("Banner upload failed.");
      setTimeout(() => setAdminError(null), 3000);
    }
  };

  const handleSaveNotice = async (text: string) => {
    try {
      setAppNotice(text);
      await setDoc(doc(db, "settings", "app_notice"), { value: text }, { merge: true });
      await triggerGlobalSync();
      setAdminStatus("Notice updated globally!");
      setTimeout(() => setAdminStatus(null), 3000);
    } catch (e) {
      console.warn("Error saving notice:", e);
      setAdminError("Error saving notice.");
      setTimeout(() => setAdminError(null), 3000);
    }
  };

  const handleSaveDownloadInfo = async () => {
    try {
      await setDoc(doc(db, "settings", "app_download_title"), { value: downloadTitleInput }, { merge: true });
      await setDoc(doc(db, "settings", "app_download_link"), { value: downloadLinkInput }, { merge: true });
      await triggerGlobalSync();
      setAdminStatus("App download info updated globally!");
      setTimeout(() => setAdminStatus(null), 3000);
    } catch (e) {
      console.warn("Error saving download info:", e);
      setAdminError("Failed to update download info.");
      setTimeout(() => setAdminError(null), 3000);
    }
  };

  const handleApkFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Check if it's an APK file
    const extension = file.name.split('.').pop()?.toLowerCase();
    if (extension !== 'apk') {
      setAdminError("Security Policy: Only .apk files are permitted.");
      setTimeout(() => setAdminError(null), 3000);
      return;
    }

    try {
      setIsApkUploading(true);
      setAdminStatus("Preparing cloud upload...");
      
      const storageRef = ref(storage, `apks/tuhinext-tv.apk`);
      const uploadTask = uploadBytesResumable(storageRef, file);

      uploadTask.on('state_changed', 
        (snapshot) => {
          const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
          setAdminStatus(`Uploading APK: ${Math.round(progress)}%`);
        }, 
        (error) => {
          setIsApkUploading(false);
          setAdminError("Upload failed: " + error.message);
          setTimeout(() => setAdminError(null), 3000);
        }, 
        async () => {
          try {
            const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
            setDownloadLinkInput(downloadURL);
            await setDoc(doc(db, "settings", "app_download_link"), { value: downloadURL }, { merge: true });
            await triggerGlobalSync();
            
            setAdminStatus(`APK successfully uploaded and synced globally!`);
            setIsApkUploading(false);
            setTimeout(() => setAdminStatus(null), 3000);
          } catch (e) {
            setIsApkUploading(false);
            setAdminError("Failed to get download URL.");
            setTimeout(() => setAdminError(null), 3000);
          }
        }
      );
    } catch (err) {
      setIsApkUploading(false);
      setAdminError("Upload initialization failed.");
      setTimeout(() => setAdminError(null), 3000);
    }
  };

  const handleSaveAppLogoUrl = async (url: string) => {
    try {
      setAppLogoUrl(url);
      setLogoInput(url);
      localStorage.setItem("tuhinext_app_logo", url);
      await setDoc(doc(db, "settings", "app_logo"), { value: url }, { merge: true });
      await triggerGlobalSync();
      setAdminStatus("Application header logo saved and synced globally!");
      setTimeout(() => setAdminStatus(null), 3000);
    } catch (e) {
      console.warn("Error saving custom logo:", e);
      setAdminStatus("Logo saved locally, database error.");
      setTimeout(() => setAdminStatus(null), 3000);
    }
  };

  const handleSaveMobileSplashUrl = async (url: string) => {
    try {
      setBrandingSplashUrlMobile(url);
      setSplashMobileInput(url);
      await setDoc(doc(db, "settings", "branding_splash_url_mobile"), { value: url }, { merge: true });
      await triggerGlobalSync();
      setAdminStatus("Mobile splash updated!");
      setTimeout(() => setAdminStatus(null), 3000);
    } catch (e) {
      setAdminStatus("Save failed.");
      setTimeout(() => setAdminStatus(null), 3000);
    }
  };

  const handleSavePcSplashUrl = async (url: string) => {
    try {
      setBrandingSplashUrlTv(url);
      setSplashPcInput(url);
      await setDoc(doc(db, "settings", "branding_splash_url_tv"), { value: url }, { merge: true });
      await triggerGlobalSync();
      setAdminStatus("PC splash updated!");
      setTimeout(() => setAdminStatus(null), 3000);
    } catch (e) {
      setAdminStatus("Save failed.");
      setTimeout(() => setAdminStatus(null), 3000);
    }
  };

  const handleSaveSplashScreenUrl = async (url: string) => {
    try {
      setSplashScreenUrl(url);
      setSplashInput(url);
      localStorage.setItem("tuhinext_splash_screen_image_url", url);
      await setDoc(doc(db, "settings", "splash_screen_image_url"), { value: url }, { merge: true });
      await triggerGlobalSync();
      setAdminStatus("Splash screen image saved and synced globally!");
      setTimeout(() => setAdminStatus(null), 3000);
    } catch (e) {
      console.warn("Error saving splash screen image:", e);
      setAdminStatus("Image saved locally, database error.");
      setTimeout(() => setAdminStatus(null), 3000);
    }
  };

  const handleLogoFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setAdminStatus("Processing logo upload...");
      const reader = new FileReader();
      reader.onload = async (event) => {
        const result = event.target?.result as string;
        await handleSaveAppLogoUrl(result);
      };
      reader.readAsDataURL(file);
    } catch (err) {
      setAdminError("Logo upload failed.");
      setTimeout(() => setAdminError(null), 3000);
    }
  };

  const handleSaveAppLogoHeight = async (heightVal: number) => {
    try {
      // Local storage and state update is already done by onChange live
      await setDoc(doc(db, "settings", "app_logo_height"), { value: String(heightVal) }, { merge: true });
      localStorage.setItem("tuhinext_logo_height", String(heightVal));
      await triggerGlobalSync();
    } catch (e) {
      console.warn("Error saving custom logo height:", e);
    }
  };

  const handleToggleHideAllChannels = async (hide: boolean) => {
    try {
      setHideAllChannels(hide);
      localStorage.setItem("tuhinext_hide_all_channels", String(hide));
      await setDoc(doc(db, "settings", "hide_all_channels"), { value: String(hide) }, { merge: true });
      await triggerGlobalSync();
      setAdminStatus(hide ? "All channels are now HIDDEN from Home!" : "All channels are now VISIBLE on Home!");
      setTimeout(() => setAdminStatus(null), 3000);
    } catch (e) {
      console.warn("Error toggling hide all:", e);
      setAdminStatus("Toggled locally, database error.");
      setTimeout(() => setAdminStatus(null), 3000);
    }
  };

  const handleSaveCategories = async (updatedCategories: CustomCategory[]) => {
    try {
      setCustomCategories(updatedCategories);
      localStorage.setItem("tuhinext_categories", JSON.stringify(updatedCategories));
      
      await setDoc(doc(db, "settings", "categories"), { value: updatedCategories }, { merge: true });
      await triggerGlobalSync();
      
      setAdminStatus("Categories updated globally!");
      setTimeout(() => setAdminStatus(null), 3000);
    } catch (e) {
      console.warn("Error saving categories:", e);
      setAdminError("Error saving categories.");
    }
  };

  const currentEditableCategories = useMemo<CustomCategory[]>(() => {
    // Start with all custom categories (which may have logos, order, and isHidden flags)
    const list = [...customCategories];
    
    // Find any categories in channels that aren't already in customCategories
    const existingNames = new Set(list.map(c => c.name.toLowerCase()));
    
    channels.forEach(ch => {
      const name = ch.category || "General";
      if (!existingNames.has(name.toLowerCase())) {
        existingNames.add(name.toLowerCase());
        list.push({
          id: `cat-${name.toLowerCase().replace(/[^a-z0-9]/g, "-")}`,
          name: name,
          logo: "",
          isHidden: false
        });
      }
    });

    return list;
  }, [channels, customCategories]);

  const handleAddCategory = (name: string, logoUrl = "", isHidden = false) => {
    const trimmed = name.trim();
    if (!trimmed) return;
    const catId = `cat-${Date.now()}`;
    const newCat: CustomCategory = {
      id: catId,
      name: trimmed,
      logo: logoUrl.trim(),
      isHidden
    };
    if (currentEditableCategories.some(c => c.name.toLowerCase() === trimmed.toLowerCase())) {
      setAdminError("Category already exists!");
      setTimeout(() => setAdminError(null), 3000);
      return;
    }
    const updated = [...currentEditableCategories, newCat];
    handleSaveCategories(updated);
  };

  const handleUpdateCategory = async (catId: string, updatedFields: Partial<CustomCategory>) => {
    const oldCat = currentEditableCategories.find(c => c.id === catId);
    if (!oldCat) return;

    const oldName = oldCat.name;
    const newName = updatedFields.name !== undefined ? updatedFields.name.trim() : oldName;

    const updatedCategories = currentEditableCategories.map(c => 
      c.id === catId ? { ...c, ...updatedFields, name: newName } : c
    );

    try {
      setCustomCategories(updatedCategories);
      localStorage.setItem("tuhinext_categories", JSON.stringify(updatedCategories));
      await setDoc(doc(db, "settings", "categories"), { value: updatedCategories }, { merge: true });

      if (newName && oldName && newName.toLowerCase() !== oldName.toLowerCase()) {
        const updatedChannels = channels.map(ch => {
          const chCat = ch.category || "General";
          if (chCat.toLowerCase() === oldName.toLowerCase()) {
            return { ...ch, category: newName };
          }
          return ch;
        });

        setChannels(updatedChannels);
        localStorage.setItem("tuhinext_channels", JSON.stringify(updatedChannels));
        await setDoc(doc(db, "settings", "custom_channels"), { value: JSON.stringify(updatedChannels) }, { merge: true });
      }

      await triggerGlobalSync();
      setAdminStatus("Category updated globally!");
      setTimeout(() => setAdminStatus(null), 3000);
    } catch (e) {
      console.warn("Error updating category/channels:", e);
      setAdminError("Error updating category.");
      setTimeout(() => setAdminError(null), 3000);
    }
  };

  const handleDeleteCategory = async (catId: string) => {
    const oldCat = currentEditableCategories.find(c => c.id === catId);
    if (!oldCat) return;

    const oldName = oldCat.name;
    const updatedCategories = currentEditableCategories.filter(c => c.id !== catId);

    try {
      setCustomCategories(updatedCategories);
      localStorage.setItem("tuhinext_categories", JSON.stringify(updatedCategories));
      await setDoc(doc(db, "settings", "categories"), { value: updatedCategories }, { merge: true });

      const updatedChannels = channels.map(ch => {
        const chCat = ch.category || "General";
        if (chCat.toLowerCase() === oldName.toLowerCase()) {
          return { ...ch, category: "General" };
        }
        return ch;
      });

      setChannels(updatedChannels);
      localStorage.setItem("tuhinext_channels", JSON.stringify(updatedChannels));
      await setDoc(doc(db, "settings", "custom_channels"), { value: JSON.stringify(updatedChannels) }, { merge: true });

      await triggerGlobalSync();
      setAdminStatus("Category deleted!");
      setTimeout(() => setAdminStatus(null), 3000);
    } catch (e) {
      console.warn("Error deleting category:", e);
      setAdminError("Error deleting category.");
      setTimeout(() => setAdminError(null), 3000);
    }
  };

  const handleMoveCategory = (index: number, direction: 'up' | 'down') => {
    let current = [...currentEditableCategories];
    if (direction === 'up' && index > 0) {
      [current[index - 1], current[index]] = [current[index], current[index - 1]];
    } else if (direction === 'down' && index < current.length - 1) {
      [current[index + 1], current[index]] = [current[index], current[index + 1]];
    } else {
      return;
    }
    handleSaveCategories(current);
  };

  useEffect(() => {
    if (!isAdmin) return;
    
    const loadUsers = async () => {
      try {
        const users = await fetchRegisteredUsers();
        setAllUsers(users);
      } catch (e) {
        console.warn("Failed to update users:", e);
      }
    };
    loadUsers();
  }, [isAdminUnlocked, loggedInUser]);

  const handleUserRegister = async () => {
    setAuthError(null);
    setAuthSuccess(null);
    const email = authEmail.trim().toLowerCase();
    const name = authName.trim();
    const password = authPassword;

    if (!email || !name || !password) {
      setAuthError("All fields are required!");
      return;
    }
    if (password.length < 4) {
      setAuthError("Password must be at least 4 characters.");
      return;
    }

    try {
      const users = await fetchRegisteredUsers();
      const exists = users.find((u) => u.email === email);
      if (exists) {
        setAuthError("This email is already registered! Please sign in.");
        return;
      }

      const newUser: UserAccount = {
        id: `usr-${Date.now()}`,
        name,
        email,
        password, // Plain string password as requested
        createdAt: new Date().toISOString(),
      };

      const updatedUsers = [...users, newUser];
      const saved = await saveRegisteredUsers(updatedUsers);
      if (!saved) {
        throw new Error("Local cache saved, but server storage limits exceeded.");
      }

      setAuthSuccess(`Account created successfully for ${name}!`);
      setLoggedInUser(newUser);
      localStorage.setItem("tuhinext_current_user", JSON.stringify(newUser));

      // Reset signup fields
      setAuthName("");
      setAuthEmail("");
      setAuthPassword("");
    } catch (err: any) {
      setAuthError(err.message || "An unexpected error occurred.");
    }
  };

  const handleUserLogin = async () => {
    setAuthError(null);
    setAuthSuccess(null);
    const email = authEmail.trim().toLowerCase();
    const password = authPassword;

    if (!email || !password) {
      setAuthError("Email and password are required!");
      return;
    }

    try {
      // Hardcoded Owner Bypass: Allow owner to login even if Firestore is down/empty
      const ownerEmails = ["rakibulhasantohin@gmail.com", "rakibulhasantuhin010@gmail.com"];
      if (ownerEmails.includes(email) && password === "123456") {
         const owner: UserAccount = {
           id: "owner-sys",
           name: "System Administrator",
           email: email,
           password: password,
           isAdmin: true,
           role: "admin",
           createdAt: new Date().toISOString()
         };
         setLoggedInUser(owner);
         localStorage.setItem("tuhinext_current_user", JSON.stringify(owner));
         setAuthSuccess("Welcome back, Chief!");
         setAuthEmail("");
         setAuthPassword("");
         return;
      }

      const users = await fetchRegisteredUsers();
      const found = users.find((u) => u.email === email);
      if (!found) {
        setAuthError("Email not registered! Please sign up first.");
        return;
      }
      if (found.password !== password) {
        setAuthError("Wrong password! Please check your credentials.");
        return;
      }

      setLoggedInUser(found);
      localStorage.setItem("tuhinext_current_user", JSON.stringify(found));
      setAuthSuccess(`Welcome back, ${found.name}!`);

      // Reset login fields
      setAuthEmail("");
      setAuthPassword("");
    } catch (err) {
      setAuthError("Authentication service is temporarily unavailable.");
    }
  };

  const handleUserLogout = () => {
    setLoggedInUser(null);
    localStorage.removeItem("tuhinext_current_user");
    setAuthSuccess("Signed out successfully.");
    setTimeout(() => setAuthSuccess(null), 3000);
  };

  const handleActivatePremium = () => {
    setPlusError(null);
    setPlusStatus(null);
    if (!plusPhone.trim()) {
      setPlusError("Please enter your sender mobile number!");
      return;
    }
    if (!plusTransaction.trim()) {
      setPlusError("Please enter your transaction ID!");
      return;
    }

    setPlusStatus("Submitting your secure activation token to network...");
    setTimeout(() => {
      localStorage.setItem("tuhinext_tvplus_active", "true");
      setIsPremiumInstalled(true);
      setPlusStatus("TUHINEXT TV PLUS Activated Successfully! Enjoy your Premium HD stream with Ad-Free playback. 👑");

      // Save premium status in loggedInUser object automatically
      if (loggedInUser) {
        const u = { ...loggedInUser, plusActive: true };
        setLoggedInUser(u);
        localStorage.setItem("tuhinext_current_user", JSON.stringify(u));
        // Save in dynamic registered users list
        fetchRegisteredUsers().then((users) => {
          const updated = users.map((user) => {
            if (user.email === u.email) {
              return { ...user, plusActive: true };
            }
            return user;
          });
          saveRegisteredUsers(updated);
        });
      }

      setPlusPhone("");
      setPlusTransaction("");
      setTimeout(() => {
        setShowPlusCheckout(false);
        setPlusStatus(null);
      }, 4000);
    }, 1800);
  };

  const handlePlayerReady = (player: Player) => {
    playerRef.current = player;
  };

  const handleSelectQuality = (qualityKey: string) => {
    if (activeChannel) {
      const updated = { ...channelQualities, [activeChannel.id]: qualityKey };
      setChannelQualities(updated);
      localStorage.setItem("tuhinext_channel_qualities", JSON.stringify(updated));
    }
    setStreamQuality(qualityKey);
    localStorage.setItem("tuhinext_stream_quality", qualityKey);
  };

  useEffect(() => {
    setDetectedActiveQuality(null);
  }, [activeChannel?.id]);

  useEffect(() => {
    if (activeChannel?.url.startsWith("http://") && window.location.protocol === "https:") {
      setMixedContentWarning("দৃষ্টি আকর্ষণ: এই লিঙ্কটি HTTP ব্যবহার করছে। ব্রাউজারের নিরাপত্তার কারণে এটি এখানে নাও চলতে পারে। তবে অ্যান্ড্রয়েড অ্যাপ হিসেবে ব্যবহার করলে এটি ঠিকমতো চলবে।");
    } else {
      setMixedContentWarning(null);
    }
  }, [activeChannel]);

  const handlePlayerError = () => {
    if (activeChannel) {
      console.warn("Player error occurred for:", activeChannel.name);
      // Instead of skipping, we can set an internal state to show a "Reload" button over the player
    }
  };

  const filteredChannels = useMemo(
    () =>
      channels.filter(
        (channel) =>
          (channel.name || "").toLowerCase() !== "amar bangla" &&
          ((channel.name || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
            (channel.category || "General").toLowerCase().includes(searchQuery.toLowerCase())),
      ),
    [channels, searchQuery],
  );

  const categories = useMemo(() => {
    if (customCategories.length > 0) {
      // Append any dynamically found categories that aren't in the custom setup (so they aren't lost)
      const existing = new Set(customCategories.map(c => c.name));
      const dynamic = new Set(channels.map((c) => c.category || "General"));
      const remaining = Array.from(dynamic).filter(c => !existing.has(c)).sort();
      
      const visibleCustom = customCategories.filter(c => !c.isHidden).map(c => c.name);
      return ["All", ...visibleCustom, ...remaining];
    }
    const s = new Set(channels.map((c) => c.category || "General"));
    return ["All", ...Array.from(s).sort()];
  }, [channels, customCategories]);

  // Reset selected category to "All" if it becomes stale or is no longer in categories list
  useEffect(() => {
    if (selectedCategory !== "All" && selectedCategory !== "Favorites" && !categories.includes(selectedCategory)) {
      setSelectedCategory("All");
    }
  }, [categories, selectedCategory]);

  const filteredGridChannels = useMemo(() => {
    return channels.filter((channel) => {
      const channelCat = channel.category || "General";
      const matchesCategory = selectedCategory === "All" || channelCat === selectedCategory;
      const matchesSearch =
        searchQuery === "" ||
        (channel.name || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
        channelCat.toLowerCase().includes(searchQuery.toLowerCase());
      const isNotHidden = (channel.name || "").toLowerCase() !== "amar bangla";
      return matchesCategory && matchesSearch && isNotHidden;
    });
  }, [channels, selectedCategory, searchQuery]);

  const adminFilteredChannels = useMemo(() => {
    if (!adminSearchQuery) return channels;
    return channels.filter((channel) => {
      const q = adminSearchQuery.toLowerCase();
      const channelCat = channel.category || "General";
      return (
        (channel.name || "").toLowerCase().includes(q) ||
        channelCat.toLowerCase().includes(q)
      );
    });
  }, [channels, adminSearchQuery]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-black flex flex-col items-center justify-center gap-4">
        <RefreshCw className="text-primary animate-spin" size={48} />
        <p className="text-white/60 font-medium animate-pulse">
          Loading channels...
        </p>
        {showLoadingSkip && (
          <button 
            onClick={() => setIsLoading(false)}
            className="mt-4 px-6 py-2 bg-white/10 hover:bg-white/20 text-white/40 hover:text-white rounded-xl text-[10px] font-bold uppercase tracking-widest transition-all"
          >
            Skip & Load Cache
          </button>
        )}
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-black flex flex-col items-center justify-center gap-4 p-6 text-center">
        <AlertCircle className="text-primary" size={64} />
        <h2 className="text-2xl font-bold text-white max-w-md">{error}</h2>
        <div className="flex flex-col sm:flex-row gap-4 mt-6">
          <button
            onClick={() => fetchPlaylist(false, true)}
            className="px-8 py-3 bg-primary text-white rounded-2xl font-bold hover:bg-primary/80 transition-all active:scale-95 shadow-lg shadow-primary/20"
          >
            Try Again
          </button>
          <button
            onClick={() => {
              localStorage.removeItem("tuhinext_playlist_url");
              localStorage.removeItem("tuhinext_channels");
              window.location.reload();
            }}
            className="px-8 py-3 bg-white/10 text-white rounded-2xl font-bold hover:bg-white/20 transition-all active:scale-95 border border-white/10"
          >
            Reset to Default
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen bg-[#050505] flex flex-col overflow-hidden relative">
      <div className="atmosphere" />

      {/* Splash Screen */}
      <AnimatePresence>
        {showSplash && (
          <motion.div
            initial={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.8, ease: "easeInOut" }}
            className="fixed inset-0 z-[99999] bg-black flex flex-col items-center justify-center select-none"
          >
            <div className="flex flex-col items-center justify-center text-center w-full h-full relative overflow-hidden">
              {(() => {
                const isMobileView = typeof window !== "undefined" && window.innerWidth < 768;
                const splashToDisplay = isMobileView 
                  ? (brandingSplashUrlMobile || splashScreenUrl) 
                  : (brandingSplashUrlTv || splashScreenUrl);
                
                if (splashToDisplay) {
                  return (
                    <motion.img 
                      src={splashToDisplay} 
                      alt="Splash" 
                      initial={{ opacity: 0, filter: 'blur(20px)', scale: 1.05 }}
                      animate={{ opacity: 1, filter: 'blur(0px)', scale: 1 }}
                      transition={{
                        duration: 1.6,
                        ease: [0.22, 1, 0.36, 1]
                      }}
                      className="w-full h-full object-cover"
                    />
                  );
                }
                return (
                  <motion.div
                    initial={{ scale: 0.9, opacity: 0 }}
                    animate={{ 
                      scale: [0.9, 1.02, 1],
                      opacity: [0, 1, 1],
                    }}
                    transition={{ 
                      duration: 1.4,
                      ease: "easeOut",
                      times: [0, 0.7, 1]
                    }}
                    className="flex flex-col items-center justify-center"
                  >
                    <TuhinextLogoSVG
                      className="w-60 sm:w-80 md:w-[26rem] h-auto text-white"
                      glow={true}
                    />
                    <motion.div 
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: 0.7, duration: 0.5 }}
                      className="mt-6 flex flex-col items-center gap-1"
                    >
                      <div className="text-[10px] sm:text-xs text-white/40 tracking-[0.25em] font-black uppercase">
                        TUHINext Ecosystem
                      </div>
                      <div className="w-12 h-0.5 bg-gradient-to-r from-transparent via-white/20 to-transparent mt-1 animate-pulse" />
                    </motion.div>
                  </motion.div>
                );
              })()}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Navbar removed for specific tab headers */}

      <main className="flex-1 flex overflow-hidden relative">

        {/* Main Content */}
        <div
          ref={mainContentRef}
          className="flex-1 overflow-y-auto p-4 lg:p-8 relative scroll-smooth no-scrollbar"
        >
          {/* Toast Notification */}
          <AnimatePresence>
            {lastRemovedChannel && (
              <motion.div
                initial={{ opacity: 0, y: 50 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="fixed bottom-8 right-8 z-50 bg-primary text-white px-6 py-3 rounded-2xl shadow-2xl flex items-center gap-3 border border-white/20 backdrop-blur-xl"
              >
                <AlertCircle size={20} />
                <span className="font-bold text-sm">
                  "{lastRemovedChannel}" is offline and removed.
                </span>
              </motion.div>
            )}
          </AnimatePresence>

          <div className="max-w-7xl mx-auto space-y-10 pb-32">
            <AnimatePresence mode="wait">
            {activeTab === "settings" && (
                <motion.div
                  key="settings"
                  initial={{ opacity: 0, scale: 0.98 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.98 }}
                  className="max-w-5xl mx-auto space-y-6"
                >
                  <div className="flex items-center gap-3 border-b border-white/5 pb-4">
                    <div className="p-2 bg-primary/10 rounded-xl">
                      <Settings className="text-primary" size={20} />
                    </div>
                    <div>
                      <h2 className="text-xl font-bold text-white tracking-tight">Settings</h2>
                      <p className="text-white/40 text-[10px] font-medium uppercase tracking-wider">Configure your preferences</p>
                    </div>
                  </div>

                  {downloadTitle && downloadLink && (
                    <div className="glass-card p-6 rounded-[2rem] border border-primary/30 bg-primary/5 relative overflow-hidden group">
                      <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
                        <Download size={100} />
                      </div>
                      <div className="relative z-10 flex flex-col sm:flex-row items-center justify-between gap-6">
                        <div className="space-y-2 text-center sm:text-left">
                          <span className="px-3 py-1 bg-primary/20 text-primary text-[10px] font-black rounded-full uppercase tracking-widest border border-primary/20">
                            Available Update
                          </span>
                          <h3 className="text-2xl font-black text-white tracking-tight">
                            {downloadTitle}
                          </h3>
                          <p className="text-white/40 text-[11px] font-medium max-w-sm">
                            Keep your application up to date for new features and improved streaming performance.
                          </p>
                        </div>
                        <button 
                          onClick={() => {
                            let link = downloadLink;
                            // Convert Google Drive links to direct download
                            if (link.includes('drive.google.com')) {
                              const match = link.match(/\/(?:d|file\/d|open\?id=)([\w-]+)/);
                              if (match && match[1]) {
                                link = `https://drive.google.com/uc?export=download&id=${match[1]}`;
                              }
                            }
                            window.open(link, "_blank", "noopener,noreferrer");
                          }}
                          className="w-full sm:w-auto px-10 py-4 bg-primary text-white text-[12px] font-black rounded-2xl uppercase tracking-widest shadow-2xl shadow-primary/30 hover:scale-[1.03] active:scale-95 transition-all flex items-center justify-center gap-3 group/btn"
                        >
                          <Download size={18} className="group-hover/btn:animate-bounce" />
                          Download Now
                        </button>
                      </div>
                    </div>
                  )}

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Compact Notifications Section */}
                    <div className="glass-card p-5 rounded-3xl border border-white/5 bg-white/20 backdrop-blur-md">
                      <div className="flex items-center gap-2 mb-4">
                        <Bell size={16} className="text-emerald-400" />
                        <h3 className="text-sm font-bold text-white">Alerts</h3>
                      </div>
                      <div className="space-y-2">
                        {[
                          { id: 'app', label: 'App Startup', state: notifApp, setter: setNotifApp },
                          { id: 'match', label: 'Match Alerts', state: notifMatch, setter: setNotifMatch }
                        ].map(item => (
                          <div key={item.id} className="flex items-center justify-between p-2.5 bg-white/5 rounded-xl border border-white/5">
                            <span className="text-[11px] text-white/70 font-medium">{item.label}</span>
                            <div onClick={() => item.setter(!item.state)} className={`w-8 h-4 flex items-center rounded-full p-0.5 cursor-pointer transition-colors ${item.state ? 'bg-emerald-500' : 'bg-white/10'}`}>
                              <div className={`bg-white w-3 h-3 rounded-full transition-transform ${item.state ? 'translate-x-4' : 'translate-x-0'}`} />
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Compact Playback Section */}
                    <div className="glass-card p-5 rounded-3xl border border-white/5 bg-white/20 backdrop-blur-md">
                      <div className="flex items-center gap-2 mb-4">
                        <SlidersHorizontal size={16} className="text-blue-400" />
                        <h3 className="text-sm font-bold text-white">Playback</h3>
                      </div>
                      <div className="space-y-3">
                        <div className="flex gap-1.5 p-1 bg-black/20 rounded-xl">
                          <button onClick={() => setBufferTime("standard")} className={`flex-1 py-1.5 text-[10px] font-bold rounded-lg transition-all ${bufferTime === "standard" ? "bg-white/10 text-white" : "text-white/40"}`}>Edge</button>
                          <button onClick={() => setBufferTime("massive")} className={`flex-1 py-1.5 text-[10px] font-bold rounded-lg transition-all ${bufferTime === "massive" ? "bg-white/10 text-white" : "text-white/40"}`}>Buffering</button>
                        </div>
                        <button 
                          onClick={() => { 
                            if (window.confirm("Safe Clear Cache? This will refresh synchronizations while keeping your login and settings active.")) {
                               sessionStorage.removeItem("firestore_quota_exhausted");
                               localStorage.removeItem("tuhinext_last_sync_time");
                               localStorage.removeItem("tuhinext_last_stats_sync");
                               localStorage.removeItem("tuhinext_cached_total_visitors");
                               window.location.reload(); 
                            }
                          }} 
                          className="w-full py-2 bg-emerald-500/5 hover:bg-emerald-500/10 text-emerald-400/60 text-[9px] font-bold uppercase tracking-widest rounded-xl transition-all border border-emerald-500/10"
                        >
                          Clear Cache & Sync
                        </button>
                      </div>
                    </div>

                    {/* Compact TV PLUS Banner Area */}
                    <div className="glass-card p-5 rounded-3xl border border-white/5 bg-gradient-to-br from-amber-500/10 to-transparent">
                      <div className="flex items-center justify-between mb-4">
                         <div className="flex items-center gap-2">
                           <Crown size={16} className="text-amber-400" />
                           <h3 className="text-sm font-bold text-white">TV PLUS</h3>
                         </div>
                         {isPremiumInstalled && <span className="text-[8px] bg-amber-400 text-black font-black px-1.5 py-0.5 rounded uppercase">PRO</span>}
                      </div>
                      <p className="text-[10px] text-white/40 mb-3 leading-relaxed">Ad-free streaming with 4K nodes and BDIX priority.</p>
                      {!isPremiumInstalled && (
                        <button onClick={() => setShowPlusCheckout(true)} className="w-full py-2 bg-amber-400 text-black font-bold text-[10px] rounded-xl uppercase tracking-wider">Go Premium</button>
                      )}
                    </div>
                  </div>
                </motion.div>
              )}

              {activeTab === "admin" && (
                <motion.div
                  key="admin"
                  initial={{ opacity: 0, scale: 0.98 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.98 }}
                  className="max-w-6xl mx-auto space-y-6 pt-10"
                >
                  {!isAdminUnlocked ? (
                    <div className="flex items-center justify-center min-h-[60vh] px-4">
                      <div className="w-full max-w-md glass-card p-8 rounded-[2.5rem] border border-white/10 bg-white/5 backdrop-blur-xl text-center shadow-2xl">
                        <div className="w-16 h-16 bg-red-500/10 rounded-full flex items-center justify-center mx-auto mb-6 border border-red-500/20">
                          <Lock size={24} className="text-red-400" />
                        </div>
                        <h3 className="text-xl font-black text-white mb-2 uppercase tracking-wide">Console Restricted</h3>
                        <p className="text-white/40 text-xs font-medium mb-8 leading-relaxed">Please enter your authorized administrative passcode to proceed to the command center.</p>
                        
                        <div className="space-y-4">
                          <input
                            type="password"
                            value={adminPasscode}
                            onChange={(e) => setAdminPasscode(e.target.value)}
                            className="w-full bg-black/40 border border-white/10 rounded-2xl px-5 py-3.5 text-sm text-white text-center outline-none focus:border-red-500/40 transition-all font-mono tracking-[0.5em]"
                            placeholder="••••••"
                          />
                          <button
                            onClick={() => {
                              if (adminPasscode === "753690") {
                                setIsAdminUnlocked(true);
                                setAdminStatus("Identity Verified. Welcome Admin.");
                                setTimeout(() => setAdminStatus(null), 3000);
                              } else {
                                setAdminError("Verification Failed. Invalid Passcode.");
                                setTimeout(() => setAdminError(null), 3000);
                              }
                            }}
                            className="w-full bg-red-600 hover:bg-red-500 text-white font-black py-4 rounded-2xl text-[10px] uppercase tracking-[0.2em] transition-all active:scale-95 shadow-xl shadow-red-600/20"
                          >
                            Authenticate Session
                          </button>
                          {adminError && <p className="text-[10px] text-red-500 mt-2 font-bold uppercase tracking-widest">{adminError}</p>}
                          {adminStatus && <p className="text-[10px] text-emerald-500 mt-2 font-bold uppercase tracking-widest">{adminStatus}</p>}
                        </div>
                      </div>
                    </div>
                  ) : (
                    <>
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-white/5 pb-4 gap-4">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-red-500/10 rounded-xl border border-red-500/20">
                          <Sliders className="text-red-400" size={18} />
                        </div>
                        <div>
                          <h2 className="text-lg font-bold text-white tracking-tight leading-none mb-1">Admin Console</h2>
                          <div className="flex items-center gap-1.5">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                            <span className="text-[8px] text-white/40 font-black uppercase tracking-widest">Global Authority</span>
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-1 bg-white/5 p-1 rounded-xl border border-white/5">
                        {[
                          { id: 'general', label: 'Meta', icon: Globe },
                          { id: 'categories', label: 'Groups', icon: LayoutList },
                          { id: 'channels', label: 'Nodes', icon: Tv }
                        ].map(sub => (
                          <button
                            key={sub.id}
                            onClick={() => setAdminSubTab(sub.id as any)}
                            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-bold transition-all cursor-pointer ${adminSubTab === sub.id ? 'bg-white/10 text-white shadow-sm' : 'text-white/40 hover:text-white/70'}`}
                          >
                            <sub.icon size={11} />
                            {sub.label}
                          </button>
                        ))}
                      </div>
                    </div>

                    <AnimatePresence mode="wait">
                      {sessionStorage.getItem("firestore_quota_exhausted") === "true" && (
                        <motion.div 
                          initial={{ opacity: 0, y: -10 }}
                          animate={{ opacity: 1, y: 0 }}
                          className="p-4 bg-red-500/10 border border-red-500/20 rounded-2xl flex items-center gap-4 mb-4"
                        >
                          <div className="w-10 h-10 bg-red-500/20 rounded-xl flex items-center justify-center flex-shrink-0">
                            <AlertCircle className="text-red-500" size={20} />
                          </div>
                          <div className="flex-1">
                            <h5 className="text-[10px] font-black text-red-500 uppercase tracking-widest">Database Quota Reached</h5>
                            <p className="text-[10px] text-red-400/60 font-medium">Your Firebase Daily Free Quote has been reset or exceeded. App is using offline cache. Consider enabling billing in Google Cloud Console for unlimited reads.</p>
                          </div>
                        </motion.div>
                      )}
                      
                      {/* General Settings */}
                      {adminSubTab === "general" && (
                        <motion.div
                          key="gen"
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -10 }}
                          className="grid grid-cols-1 md:grid-cols-2 gap-4"
                        >
                          <div className="glass-card p-5 rounded-3xl border border-white/5 bg-white/5">
                            <h4 className="text-[10px] font-black text-white/40 uppercase tracking-widest mb-4">Pipeline Root</h4>
                            <div className="space-y-3">
                              <div className="flex flex-col gap-1.5">
                                <label className="text-[8px] text-primary font-black uppercase tracking-widest pl-1">Current Active Playlist</label>
                                <input type="url" value={playlistInput} onChange={e => setPlaylistInput(e.target.value)} className="w-full bg-black/40 border border-white/10 rounded-xl px-3 py-2 text-[10px] text-white font-mono outline-none focus:border-red-500/50" placeholder="M3U8 Source URL" />
                              </div>
                              <div className="grid grid-cols-2 gap-2">
                                <button onClick={() => handleSaveSettings(playlistInput)} disabled={isSaving} className="bg-red-500 text-white text-[10px] font-black py-2 rounded-xl uppercase tracking-widest shadow-lg shadow-red-500/20">{isSaving ? "Syncing..." : "Update Sync"}</button>
                                <button onClick={handlePurgeAllData} disabled={isSaving} className="bg-white/5 border border-red-500/20 text-red-500 text-[10px] font-black py-2 rounded-xl uppercase tracking-widest hover:bg-red-500/10 transition-colors">Wipe All Data</button>
                              </div>
                            </div>
                          </div>

                          <div className="glass-card p-5 rounded-3xl border border-white/5 bg-white/5">
                            <h4 className="text-[10px] font-black text-white/40 uppercase tracking-widest mb-4">Global Branding</h4>
                            <div className="space-y-3">
                              <div className="flex gap-2">
                                <input type="url" value={logoInput} onChange={e => setLogoInput(e.target.value)} className="flex-1 bg-black/40 border border-white/10 rounded-xl px-3 py-2 text-[10px] text-white font-mono outline-none focus:border-white/30" placeholder="Header Logo URL" />
                                <label className="w-10 h-10 flex items-center justify-center rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 cursor-pointer transition-all">
                                  <FileUp size={16} className="text-white/40" />
                                  <input type="file" accept="image/*" className="hidden" onChange={handleLogoFileUpload} />
                                </label>
                              </div>
                              <div className="flex items-center gap-3 bg-black/20 p-2 rounded-lg">
                                <span className="text-[9px] font-mono text-white/30">{logoHeight}px</span>
                                <input 
                                  type="range" 
                                  min="20" 
                                  max="140" 
                                  value={logoHeight} 
                                  onChange={e => setLogoHeight(Number(e.target.value))}
                                  onMouseUp={e => handleSaveAppLogoHeight(Number((e.target as HTMLInputElement).value))}
                                  onTouchEnd={e => handleSaveAppLogoHeight(Number((e.target as HTMLInputElement).value))}
                                  className="flex-1 accent-primary h-1 bg-white/10 rounded-full cursor-pointer" 
                                />
                              </div>
                              <button onClick={() => handleSaveAppLogoUrl(logoInput)} className="w-full bg-white text-black text-[10px] font-black py-2 rounded-xl uppercase tracking-widest">Update Logo</button>
                            </div>
                          </div>

                          <div className="glass-card p-5 rounded-3xl border border-white/5 bg-white/5 md:col-span-2">
                            <h4 className="text-[10px] font-black text-white/40 uppercase tracking-widest mb-4">Splash Screen Customization</h4>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                              <div className="space-y-2">
                                <label className="text-[8px] text-white/30 uppercase font-black tracking-widest">Global Fallback</label>
                                <div className="flex gap-2">
                                  <input type="url" value={splashInput} onChange={e => setSplashInput(e.target.value)} className="flex-1 bg-black/40 border border-white/10 rounded-xl px-3 py-2 text-[10px] text-white font-mono outline-none focus:border-white/30" placeholder="Global Splash URL" />
                                </div>
                                <button onClick={() => handleSaveSplashScreenUrl(splashInput)} className="w-full bg-white/5 hover:bg-white/10 text-white text-[9px] font-black py-2 rounded-xl uppercase tracking-widest border border-white/10 transition-all">Update Global</button>
                                <p className="text-[7px] text-white/20 italic uppercase tracking-wider">Fallback if specific URLs are empty.</p>
                              </div>

                              <div className="space-y-2">
                                <label className="text-[8px] text-white/30 uppercase font-black tracking-widest">Mobile Splash (9:16)</label>
                                <div className="flex gap-2">
                                  <input type="url" value={splashMobileInput} onChange={e => setSplashMobileInput(e.target.value)} className="flex-1 bg-black/40 border border-white/10 rounded-xl px-3 py-2 text-[10px] text-white font-mono outline-none focus:border-white/30" placeholder="Mobile Splash URL" />
                                </div>
                                <button onClick={() => handleSaveMobileSplashUrl(splashMobileInput)} className="w-full bg-primary hover:bg-primary/90 text-white text-[9px] font-black py-2 rounded-xl uppercase tracking-widest shadow-lg shadow-primary/20 transition-all">Update Mobile</button>
                                <p className="text-[7px] text-white/20 italic uppercase tracking-wider">Optimized for vertical screens.</p>
                              </div>

                              <div className="space-y-2">
                                <label className="text-[8px] text-white/30 uppercase font-black tracking-widest">PC / TV Splash (16:9)</label>
                                <div className="flex gap-2">
                                  <input type="url" value={splashPcInput} onChange={e => setSplashPcInput(e.target.value)} className="flex-1 bg-black/40 border border-white/10 rounded-xl px-3 py-2 text-[10px] text-white font-mono outline-none focus:border-white/30" placeholder="PC Splash URL" />
                                </div>
                                <button onClick={() => handleSavePcSplashUrl(splashPcInput)} className="w-full bg-primary hover:bg-primary/90 text-white text-[9px] font-black py-2 rounded-xl uppercase tracking-widest shadow-lg shadow-primary/20 transition-all">Update PC</button>
                                <p className="text-[7px] text-white/20 italic uppercase tracking-wider">Optimized for horizontal screens.</p>
                              </div>
                            </div>
                          </div>

                          <div className="glass-card p-5 rounded-3xl border border-white/5 bg-white/5 md:col-span-2">
                            <h4 className="text-[10px] font-black text-white/40 uppercase tracking-widest mb-3">Notice Banner</h4>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                              <div className="space-y-3">
                                <label className="text-[8px] text-white/30 uppercase font-black tracking-widest">Banner Image</label>
                                <div className="flex gap-2">
                                  <input type="url" value={bannerInput} onChange={e => setBannerInput(e.target.value)} className="flex-1 bg-black/40 border border-white/10 rounded-xl px-3 py-2 text-[10px] text-white font-mono outline-none focus:border-emerald-500/50" placeholder="Banner Image URL" />
                                  <label className="w-10 h-10 flex items-center justify-center rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 cursor-pointer transition-all">
                                    <FileUp size={16} className="text-white/40" />
                                    <input type="file" accept="image/*" className="hidden" onChange={handleBannerFileUpload} />
                                  </label>
                                </div>
                                <button onClick={() => handleSaveBannerImageUrl(bannerInput)} className="w-full bg-emerald-500 text-black text-[10px] font-black py-2 rounded-xl uppercase tracking-widest">Push Banner</button>
                                {bannerImageUrl && <div className="h-16 bg-black/40 rounded-xl border border-white/5 flex items-center justify-center p-2"><img src={bannerImageUrl || null} className="max-w-full max-h-full object-contain" alt="Preview"/></div>}
                              </div>
                              <div className="space-y-3">
                                <label className="text-[8px] text-white/30 uppercase font-black tracking-widest">Scroll Notice Message</label>
                                <textarea value={appNotice} onChange={e => setAppNotice(e.target.value)} className="w-full h-24 bg-black/40 border border-white/10 rounded-xl px-3 py-2 text-[10px] text-white outline-none focus:border-emerald-500/50 resize-none" placeholder="Enter notice text here for home page animation..." />
                                <button onClick={() => handleSaveNotice(appNotice)} className="w-full bg-blue-500 text-white text-[10px] font-black py-2 rounded-xl uppercase tracking-widest">Update Notice</button>
                              </div>
                            </div>
                          </div>

                          <div className="glass-card p-5 rounded-3xl border border-white/5 bg-white/5 md:col-span-1">
                            <h4 className="text-[10px] font-black text-white/40 uppercase tracking-widest mb-3">App Download Config</h4>
                            <div className="space-y-3">
                              <div className="space-y-1">
                                <label className="text-[8px] text-white/30 uppercase font-black tracking-widest">Button Title</label>
                                <input type="text" value={downloadTitleInput} onChange={e => setDownloadTitleInput(e.target.value)} className="w-full bg-black/40 border border-white/10 rounded-xl px-3 py-2 text-[10px] text-white outline-none focus:border-primary/50 transition-all" placeholder="e.g. Download v2.0 APK" />
                              </div>
                              <div className="space-y-1">
                                <label className="text-[8px] text-white/30 uppercase font-black tracking-widest">Direct Link OR Upload APK</label>
                                <div className="flex gap-2">
                                  <input type="url" value={downloadLinkInput} onChange={e => setDownloadLinkInput(e.target.value)} className="flex-1 bg-black/40 border border-white/10 rounded-xl px-3 py-2 text-[10px] text-white font-mono outline-none focus:border-primary/50 transition-all" placeholder="https://..." />
                                  <label className={`w-10 h-10 flex items-center justify-center rounded-xl border border-white/10 cursor-pointer transition-all ${isApkUploading ? 'bg-primary/20 animate-pulse' : 'bg-white/5 hover:bg-white/10'}`}>
                                    <FileUp size={16} className="text-white/40" />
                                    <input type="file" accept=".apk" className="hidden" onChange={handleApkFileUpload} disabled={isApkUploading} />
                                  </label>
                                </div>
                              </div>
                              <button onClick={handleSaveDownloadInfo} className="w-full bg-primary text-white text-[10px] font-black py-2.5 rounded-xl uppercase tracking-widest shadow-lg shadow-primary/20 hover:scale-[1.02] active:scale-95 transition-all">Sync Cloud Release</button>
                            </div>
                          </div>
                        </motion.div>
                      )}

                      {/* Categories Management */}
                      {adminSubTab === "categories" && (
                        <motion.div
                          key="cats"
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -10 }}
                          className="space-y-6"
                        >
                          {/* Create Category Form */}
                          <div className="glass-card p-6 rounded-3xl border border-white/5 bg-white/5">
                            <h4 className="text-[10px] font-black text-white/40 uppercase tracking-widest mb-4">Create New Category</h4>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
                              <div className="space-y-1">
                                <label className="text-[8px] text-white/30 uppercase font-black tracking-widest">Category Name</label>
                                <input 
                                  type="text" 
                                  value={newCategoryName} 
                                  onChange={e => setNewCategoryName(e.target.value)} 
                                  placeholder="e.g. Sports, BD Channels..." 
                                  className="w-full bg-black/40 border border-white/10 rounded-xl px-3 py-2 text-[10px] text-white outline-none focus:border-primary/50 transition-all" 
                                />
                              </div>
                              <div className="space-y-1">
                                <label className="text-[8px] text-white/30 uppercase font-black tracking-widest">Category Logo URL (Optional)</label>
                                <input 
                                  type="url" 
                                  value={newCategoryLogo} 
                                  onChange={e => setNewCategoryLogo(e.target.value)} 
                                  placeholder="https://..." 
                                  className="w-full bg-black/40 border border-white/10 rounded-xl px-3 py-2 text-[10px] text-white font-mono outline-none focus:border-primary/50 transition-all" 
                                />
                              </div>
                              <div className="flex gap-3">
                                <button 
                                  onClick={() => setNewCategoryIsHidden(!newCategoryIsHidden)}
                                  className={`flex-1 py-2 px-3 rounded-xl border text-[9px] font-black uppercase tracking-wider flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                                    newCategoryIsHidden 
                                      ? "bg-red-500/10 border-red-500/30 text-red-400" 
                                      : "bg-white/5 border-white/10 text-white/60 hover:bg-white/10"
                                  }`}
                                >
                                  {newCategoryIsHidden ? <EyeOff size={12} /> : <Eye size={12} />}
                                  {newCategoryIsHidden ? "Hidden" : "Visible"}
                                </button>
                                <button 
                                  onClick={() => { 
                                    if(newCategoryName.trim()) { 
                                      handleAddCategory(newCategoryName, newCategoryLogo, newCategoryIsHidden); 
                                      setNewCategoryName(""); 
                                      setNewCategoryLogo("");
                                      setNewCategoryIsHidden(false);
                                    } else {
                                      setAdminError("Category Name is required!");
                                      setTimeout(() => setAdminError(null), 3000);
                                    }
                                  }} 
                                  className="flex-1 py-2 px-3 bg-emerald-500 text-black text-[9px] font-black uppercase tracking-wider rounded-xl hover:opacity-90 flex items-center justify-center gap-1.5 transition-all cursor-pointer"
                                >
                                  <Plus size={12} />
                                  Add Category
                                </button>
                              </div>
                            </div>
                          </div>

                          {/* Directory List */}
                          <div className="glass-card p-6 rounded-3xl border border-white/5 bg-white/5">
                            <h4 className="text-[10px] font-black text-white/40 uppercase tracking-widest mb-4">Directory Hierarchy ({currentEditableCategories.length})</h4>
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                              {currentEditableCategories.map((cat, i) => {
                                const logoSrc = cat.logo || getCategoryLogoWithCustom(cat.name);
                                return (
                                  <div key={cat.id || i} className="flex flex-col bg-black/40 p-4 rounded-2.5xl border border-white/5 hover:border-white/10 transition-all group relative overflow-hidden justify-between">
                                    <div className="flex items-center gap-3">
                                      <div className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center overflow-hidden border border-white/10 shrink-0">
                                        <img src={logoSrc} alt={cat.name} className="w-full h-full object-cover" onError={(e) => { (e.target as HTMLImageElement).src = "https://digitalsynopsis.com/wp-content/uploads/2018/06/fifa-world-cup-logos-usa-mexico-canada-2026.jpg" }} />
                                      </div>
                                      <div className="truncate flex-1">
                                        <h5 className="text-[11px] font-black text-white uppercase tracking-tight truncate">{cat.name}</h5>
                                        <span className="text-[8px] font-bold text-white/30 uppercase tracking-widest block mt-0.5">
                                          {cat.isHidden ? "Hidden from Tabs" : "Visible"}
                                        </span>
                                      </div>
                                      {cat.isHidden && (
                                        <span className="absolute top-2 right-2 bg-red-500/10 border border-red-500/20 text-red-500 text-[7px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded-full flex items-center gap-0.5">
                                          <EyeOff size={8} /> Hidden
                                        </span>
                                      )}
                                    </div>

                                    <div className="flex items-center justify-between border-t border-white/5 pt-3 mt-3">
                                      <div className="flex items-center gap-1">
                                        <button 
                                          onClick={() => handleMoveCategory(i, 'up')} 
                                          disabled={i === 0} 
                                          className="p-1.5 bg-white/5 text-white/30 hover:text-white rounded-lg disabled:opacity-20 cursor-pointer transition-colors"
                                          title="Move Up"
                                        >
                                          <ChevronUp size={12} />
                                        </button>
                                        <button 
                                          onClick={() => handleMoveCategory(i, 'down')} 
                                          disabled={i === currentEditableCategories.length - 1} 
                                          className="p-1.5 bg-white/5 text-white/30 hover:text-white rounded-lg disabled:opacity-20 cursor-pointer transition-colors"
                                          title="Move Down"
                                        >
                                          <ChevronDown size={12} />
                                        </button>
                                      </div>

                                      <div className="flex items-center gap-1">
                                        <button 
                                          onClick={() => handleUpdateCategory(cat.id, { isHidden: !cat.isHidden })} 
                                          className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                                            cat.isHidden 
                                              ? 'bg-red-500/10 text-red-400 hover:bg-red-500/20' 
                                              : 'bg-white/5 text-white/40 hover:text-white'
                                          }`}
                                          title={cat.isHidden ? "Make Visible" : "Hide Category"}
                                        >
                                          {cat.isHidden ? <EyeOff size={12} /> : <Eye size={12} />}
                                        </button>
                                        <button 
                                          onClick={() => {
                                            setEditingCatId(cat.id);
                                            setEditingCatName(cat.name);
                                            setEditingCatLogo(cat.logo || "");
                                            setEditingCatIsHidden(!!cat.isHidden);
                                          }} 
                                          className="p-1.5 bg-white/5 text-white/40 hover:text-white rounded-lg transition-colors cursor-pointer"
                                          title="Edit Category"
                                        >
                                          <Edit size={12} />
                                        </button>
                                        <button 
                                          onClick={() => {
                                            if (window.confirm(`Are you sure you want to delete the category "${cat.name}"?`)) {
                                              handleDeleteCategory(cat.id);
                                            }
                                          }} 
                                          className="p-1.5 bg-red-500/10 text-red-500 hover:bg-red-500/20 rounded-lg transition-all cursor-pointer"
                                          title="Delete Category"
                                        >
                                          <Trash2 size={12} />
                                        </button>
                                      </div>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        </motion.div>
                      )}

                      {/* Channels Management */}
                      {adminSubTab === "channels" && (
                        <motion.div
                          key="chans"
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -10 }}
                          className="space-y-4"
                        >
                          <div className="flex flex-col sm:flex-row gap-3">
                            <div className="flex-1 relative flex items-center">
                              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30" />
                              <input type="text" placeholder="Search Channels..." value={adminSearchQuery} onChange={e => setAdminSearchQuery(e.target.value)} className="w-full bg-black/40 border border-white/10 rounded-xl pl-9 pr-16 py-2 text-[10px] text-white font-bold outline-none focus:border-white/30" />
                              {adminSearchQuery && (
                                <button 
                                  onClick={() => setAdminSearchQuery("")} 
                                  className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1 text-white/40 hover:text-white cursor-pointer bg-white/5 hover:bg-white/10 px-1.5 py-0.5 rounded border border-white/5 transition-all"
                                  title="Clear Search"
                                >
                                  <X size={10} />
                                  <span className="text-[8px] font-bold uppercase tracking-wider hidden sm:inline">Clear</span>
                                </button>
                              )}
                            </div>
                            <div className="flex gap-2">
                              {selectedChannelIds.size > 0 && (
                                <button onClick={handleBulkDelete} className="px-4 py-2 bg-red-500 text-white text-[10px] font-black rounded-xl uppercase tracking-widest shadow-lg shadow-red-500/20">Delete Selected ({selectedChannelIds.size})</button>
                              )}
                              <button 
                                onClick={async () => {
                                  if (window.confirm("ARE YOU SURE? This will permanently delete ALL channels in the library!")) {
                                    setAdminStatus("Initiating wipe of all cloud channels...");
                                    localStorage.setItem("tuhinext_library_synced", "true");
                                    await setDoc(doc(db, "settings", "library_synced"), { value: "true" }, { merge: true });
                                    const batch = writeBatch(db);
                                    channels.forEach(ch => {
                                      batch.delete(doc(db, "channels", ch.id));
                                    });
                                    await batch.commit();
                                    setAdminStatus("All channels permanently deleted!");
                                    setTimeout(() => setAdminStatus(null), 3000);
                                  }
                                }}
                                className="px-4 py-2 bg-red-600/10 text-red-500 border border-red-500/20 text-[10px] font-black rounded-xl uppercase tracking-widest hover:bg-red-500 hover:text-white transition-all"
                              >
                                Clear All Channels
                              </button>
                              <button onClick={() => {
                                setEditingChanId("new");
                                setEditingChanName("");
                                setEditingChanUrl("");
                                setEditingChanLogo("");
                                setEditingChanCategory("");
                                setEditingChanLogoPadding(0);
                              }} className="px-4 py-2 bg-white text-black text-[10px] font-black rounded-xl uppercase tracking-widest shadow-lg shadow-white/5">+ Add Channel</button>
                              <button onClick={handleSyncToCloud} className="px-4 py-2 bg-blue-500/10 text-blue-400 border border-blue-500/20 text-[10px] font-black rounded-xl uppercase tracking-widest flex items-center gap-2"><UploadCloud size={12} /> Sync Library</button>
                            </div>
                          </div>

                          <div className="glass-card rounded-2xl border border-white/5 bg-black/40 overflow-hidden">
                            <div className="max-h-[400px] overflow-y-auto no-scrollbar">
                              <table className="w-full text-left">
                                <thead className="bg-white/5 sticky top-0 z-10">
                                  <tr>
                                    <th className="px-4 py-2 text-[9px] font-black text-white/40 uppercase tracking-widest">
                                      <div className="flex items-center gap-3">
                                        <div className="relative flex-shrink-0 cursor-pointer" onClick={() => handleSelectAll(selectedChannelIds.size < Math.min(100, adminFilteredChannels.length))}>
                                          <div className={`w-3.5 h-3.5 rounded border transition-all flex items-center justify-center ${selectedChannelIds.size > 0 && selectedChannelIds.size === Math.min(100, adminFilteredChannels.length) ? 'bg-primary border-primary' : 'border-white/20 bg-black/40'}`}>
                                            {selectedChannelIds.size > 0 && <Check size={8} className="text-white" />}
                                          </div>
                                        </div>
                                        <span>Identify</span>
                                      </div>
                                    </th>
                                    <th className="px-4 py-2 text-[9px] font-black text-white/40 uppercase tracking-widest text-right">Settings</th>
                                  </tr>
                                </thead>
                                <tbody className="divide-y divide-white/5">
                                  {adminFilteredChannels.slice(0, 100).map(ch => (
                                    <tr key={ch.id} className="hover:bg-white-[0.01] transition-colors group">
                                      <td className="px-4 py-2">
                                        <div className="flex items-center gap-3">
                                          <div className="relative flex-shrink-0 cursor-pointer" onClick={() => { const s = new Set(selectedChannelIds); s.has(ch.id) ? s.delete(ch.id) : s.add(ch.id); setSelectedChannelIds(s); }}>
                                            <div className={`w-3.5 h-3.5 rounded border transition-all flex items-center justify-center ${selectedChannelIds.has(ch.id) ? 'bg-primary border-primary' : 'border-white/20 bg-black/40'}`}>
                                              {selectedChannelIds.has(ch.id) && <Check size={8} className="text-white" />}
                                            </div>
                                          </div>
                                          <div className="w-7 h-7 rounded bg-black/60 p-1 border border-white/5 flex items-center justify-center overflow-hidden">
                                            <img src={optimizeImage(ch.logo, 56, 56) || ch.logo || DEFAULT_CHANNEL_LOGO} className="max-w-full max-h-full object-contain" alt="" onError={e => (e.target as HTMLImageElement).src = DEFAULT_CHANNEL_LOGO} />
                                          </div>
                                          <div className="min-w-0">
                                            <p className={`text-[10px] font-bold truncate tracking-tight ${ch.isHidden ? 'text-white/20 line-through' : 'text-white/90'}`}>{ch.name}</p>
                                            <p className="text-[8px] text-white/20 font-bold uppercase tracking-widest">{ch.category}</p>
                                          </div>
                                        </div>
                                      </td>
                                      <td className="px-4 py-2 text-right">
                                        <div className="flex justify-end gap-1 opacity-100 sm:opacity-0 group-hover:opacity-100 transition-opacity">
                                          <div className="flex bg-white/5 rounded-lg border border-white/5 mr-1 overflow-hidden">
                                            <button 
                                              disabled={channels.findIndex(c => c.id === ch.id) === 0}
                                              onClick={() => handleMoveChannel(ch.id, 'up')} 
                                              className="p-1 px-1.5 text-white/40 hover:text-white hover:bg-white/10 disabled:opacity-20 disabled:pointer-events-none transition-all"
                                            >
                                              <ChevronUp size={12} />
                                            </button>
                                            <div className="w-[1px] bg-white/5" />
                                            <button 
                                              disabled={channels.findIndex(c => c.id === ch.id) === channels.length - 1}
                                              onClick={() => handleMoveChannel(ch.id, 'down')} 
                                              className="p-1 px-1.5 text-white/40 hover:text-white hover:bg-white/10 disabled:opacity-20 disabled:pointer-events-none transition-all"
                                            >
                                              <ChevronDown size={12} />
                                            </button>
                                          </div>
                                          <button onClick={() => handleAdminUpdateChannel(ch.id, { isHidden: !ch.isHidden })} className={`p-1.5 rounded-lg transition-colors ${ch.isHidden ? 'text-emerald-400 bg-emerald-400/5' : 'text-amber-400 bg-amber-400/5'}`}>{ch.isHidden ? <Eye size={12} /> : <EyeOff size={12} />}</button>
                                <button onClick={() => { setEditingChanId(ch.id); setEditingChanName(ch.name); setEditingChanUrl(ch.url); setEditingChanLogo(ch.logo); setEditingChanCategory(ch.category); setEditingChanLogoPadding(ch.logoPadding || 0); }} className="p-1.5 text-blue-400 hover:bg-blue-400/10 rounded-lg transition-colors"><Edit size={12} /></button>
                                          <button onClick={() => setDeletingChanId(ch.id)} className="p-1.5 text-red-500 hover:bg-red-500/10 rounded-lg transition-colors"><Trash2 size={12} /></button>
                                        </div>
                                      </td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                    </>
                  )}
                </motion.div>
              )}
              {activeTab === "home" && (
                <motion.div
                  key="home"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.3, ease: "easeOut" }}
                  className="space-y-4 sm:space-y-6 pb-20"
                >
                  {/* Top Channels Stats Bar */}
                  {homeView !== "player" && (
                    <div className="flex items-center justify-center w-full px-6 py-3 bg-white/[0.03] border border-white/5 rounded-2xl">
                      <div 
                        onClick={() => {
                          setHeaderClickCount(prev => {
                            const newCount = prev + 1;
                            if (headerClickTimerRef.current) clearTimeout(headerClickTimerRef.current);
                            
                            if (newCount >= 5) {
                              setShowAdminTrigger(true);
                              setActiveTab("admin");
                              setAdminStatus("Admin Access Triggered!");
                              setTimeout(() => setAdminStatus(null), 3000);
                              return 0;
                            }

                            headerClickTimerRef.current = setTimeout(() => {
                              setHeaderClickCount(0);
                            }, 3000); // Reset after 3 seconds of inactivity

                            return newCount;
                          });
                        }}
                        className="flex items-center gap-2 px-6 py-2 bg-primary/10 rounded-xl border border-primary/20 shrink-0 cursor-pointer active:scale-95 transition-all hover:bg-primary/20"
                      >
                        <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />
                        <span className="text-[11px] sm:text-[12px] font-black text-white uppercase tracking-[0.3em] leading-none whitespace-nowrap">
                          TUHINEXT TV
                        </span>
                      </div>
                    </div>
                  )}

                  {/* Facebook Follow popup verification trigger check */}
                  <AnimatePresence>
                    {pendingChannelToPlay && (
                      <motion.div 
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-[9999] flex items-center justify-center p-4 backdrop-blur-2xl bg-black/85"
                      >
                        <motion.div 
                          initial={{ opacity: 0, scale: 0.95, y: 30 }}
                          animate={{ opacity: 1, scale: 1, y: 0 }}
                          exit={{ opacity: 0, scale: 0.95, y: 30 }}
                          transition={{ type: "spring", damping: 25, stiffness: 350 }}
                          className="w-full max-w-md bg-gradient-to-b from-[#101428] to-[#070914] border border-white/10 rounded-[2.5rem] p-8 text-center shadow-2xl relative overflow-hidden"
                        >
                          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-40 h-40 bg-primary/20 rounded-full blur-3xl pointer-events-none" />
                          
                          <div className="mx-auto w-16 h-16 rounded-full bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400 mb-6 shadow-lg shadow-blue-500/5">
                            {fbPageLogo ? (
                              <img src={fbPageLogo} alt="Facebook Logo" className="w-10 h-10 rounded-full object-cover" />
                            ) : (
                              <svg className="w-8 h-8 fill-current" viewBox="0 0 24 24">
                                <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                              </svg>
                            )}
                          </div>

                          <h3 className="text-xl font-black text-white mb-3 uppercase tracking-wide">{fbPopupTitle}</h3>
                          <p className="text-white/70 text-sm font-medium leading-relaxed mb-6 px-2">{fbPopupDesc}</p>

                          <div className="bg-white/[0.03] border border-white/5 rounded-2xl p-4 mb-6 flex items-center gap-3">
                            <img src={pendingChannelToPlay.logo} alt="Pending channel" className="w-10 h-10 rounded-xl object-contain bg-white p-1" />
                            <div className="text-left">
                              <span className="text-[8px] font-black text-primary uppercase tracking-widest">Locked Stream</span>
                              <h4 className="text-xs font-black text-white uppercase">{pendingChannelToPlay.name}</h4>
                            </div>
                          </div>

                          {isFbVerifying ? (
                            <div className="space-y-3 py-4">
                              <div className="flex items-center justify-center gap-3 text-emerald-400 font-bold text-sm">
                                <div className="w-5 h-5 border-2 border-emerald-500/20 border-t-emerald-400 rounded-full animate-spin" />
                                Verifying follow status...
                              </div>
                              <div className="text-[10px] text-white/30 animate-pulse font-medium">Please wait. Checking validation parameters...</div>
                            </div>
                          ) : (
                            <div className="flex flex-col gap-3">
                              <button
                                onClick={() => {
                                  window.open(fbPageUrl, "_blank");
                                  setIsFbVerifying(true);
                                  setTimeout(() => {
                                    setIsFbVerifying(false);
                                    setFbUnlocked(true);
                                    localStorage.setItem("tuhinext_fb_unlocked", "true");
                                    setActiveChannel(pendingChannelToPlay);
                                    setHomeView("player");
                                    setPendingChannelToPlay(null);
                                  }, 4000);
                                }}
                                className="w-full py-4 bg-blue-600 hover:bg-blue-500 text-white font-black rounded-2xl uppercase tracking-widest shadow-xl shadow-blue-600/30 active:scale-95 transition-all cursor-pointer flex items-center justify-center gap-2"
                              >
                                {fbUnlockBtnText}
                              </button>
                              <button
                                onClick={() => setPendingChannelToPlay(null)}
                                className="w-full py-3.5 bg-white/5 hover:bg-white/10 text-white/40 hover:text-white/70 font-black rounded-2xl text-[10px] uppercase tracking-widest transition-all cursor-pointer"
                              >
                                Cancel
                              </button>
                            </div>
                          )}
                        </motion.div>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  {/* Scrolling Notice Message */}
                  {appNotice && (
                    <div className="w-full bg-black/40 border border-white/5 rounded-xl py-2 px-4 overflow-hidden relative backdrop-blur-sm">
                      <div className="flex">
                        <motion.div
                          animate={{ x: [0, -1000] }}
                          transition={{ 
                            x: {
                              repeat: Infinity,
                              repeatType: "loop",
                              duration: 15,
                              ease: "linear",
                            },
                          }}
                          className="whitespace-nowrap text-white text-[10.5px] font-bold tracking-wide flex gap-12 items-center"
                        >
                          <span>{appNotice}</span>
                          <span>{appNotice}</span>
                          <span>{appNotice}</span>
                        </motion.div>
                      </div>
                    </div>
                  )}

                  {/* Multi-Screen IPTV Layout Flow */}
                  {homeView === "dashboard" && (
                    <div className="space-y-6">
                      {/* Integrated Search Box & Quick Info */}
                      <div className="relative w-full">
                        <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-white/30" />
                        <input 
                          type="text" 
                          placeholder="Search TV channels or categories..." 
                          value={searchQuery}
                          onChange={e => setSearchQuery(e.target.value)}
                          className="w-full bg-white/[0.03] border border-white/5 hover:border-white/10 focus:border-primary/40 rounded-2xl pl-11 pr-16 py-3.5 text-xs text-white outline-none transition-all placeholder:text-white/30"
                        />
                        {searchQuery && (
                          <button 
                            onClick={() => setSearchQuery("")} 
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-[9px] bg-white/5 hover:bg-white/10 text-white/50 hover:text-white px-2 py-1 rounded-lg border border-white/5 font-black uppercase tracking-widest cursor-pointer"
                          >
                            Clear
                          </button>
                        )}
                      </div>

                      {/* Header Logo Banner */}
                      {bannerImageUrl ? (
                        <motion.div
                          initial={{ opacity: 0, scale: 0.99 }}
                          animate={{ opacity: 1, scale: 1 }}
                          className="w-full relative rounded-2xl overflow-hidden border border-white/5 shadow-2xl bg-[#090b11] p-0.5"
                        >
                          <img
                            src={bannerImageUrl}
                            alt="Promotional Banner"
                            className="w-full aspect-[21/9] sm:aspect-[21/7] md:aspect-[21/6] object-cover rounded-xl"
                            onError={(e) => {
                              e.currentTarget.style.display = "none";
                            }}
                          />
                        </motion.div>
                      ) : (
                        brandingMobileBanner && (
                          <motion.div
                            initial={{ opacity: 0, scale: 0.99 }}
                            animate={{ opacity: 1, scale: 1 }}
                            className="w-full relative rounded-2xl overflow-hidden border border-white/5 shadow-2xl bg-[#090b11] p-0.5"
                          >
                            <img
                              src={brandingMobileBanner}
                              alt="Branding Mobile Banner"
                              className="w-full aspect-[21/9] sm:aspect-[21/7] md:aspect-[21/6] object-cover rounded-xl"
                            />
                          </motion.div>
                        )
                      )}

                      {/* Categories Bento Cards Grid */}
                      <div className="space-y-3">
                        <h3 className="text-[10px] font-black text-white/40 uppercase tracking-widest flex items-center gap-2">
                          <span className="w-1 h-3 bg-primary rounded-full" />
                          Live TV Categories
                        </h3>

                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-8 gap-3 sm:gap-4 md:gap-5">
                          {categories.filter(c => c !== "All" && c !== "Favorites").map((cat) => {
                            const count = channels.filter(c => c.category === cat || (!c.category && cat === "General")).length;
                            return (
                              <motion.button
                                key={cat}
                                whileHover={{ y: -5, scale: 1.02 }}
                                whileTap={{ scale: 0.98 }}
                                onClick={() => {
                                  setSelectedCategory(cat);
                                  setHomeView("category");
                                }}
                                className="group relative flex flex-col items-center bg-gradient-to-b from-[#0e1222] to-[#080a14] border border-white/5 hover:border-white/15 rounded-3xl p-5 text-center shadow-lg hover:shadow-primary/5 cursor-pointer overflow-hidden min-h-[140px] justify-between"
                              >
                                {/* Category glow effect */}
                                <div className="absolute inset-0 bg-gradient-to-t from-primary/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                                
                                <div className="w-14 h-14 rounded-full bg-white flex items-center justify-center p-0.5 shadow-xl relative overflow-hidden group-hover:scale-105 transition-transform duration-500 shrink-0">
                                  <img 
                                    src={getCategoryLogoWithCustom(cat)} 
                                    alt={cat} 
                                    className="w-full h-full object-cover rounded-full"
                                  />
                                </div>

                                <div className="z-10 mt-3 w-full">
                                  <h4 className="text-xs font-black text-white group-hover:text-primary transition-colors uppercase tracking-tight truncate px-1">
                                    {cat}
                                  </h4>
                                  <span className="text-[8.5px] font-extrabold text-white/30 group-hover:text-white/50 tracking-wider uppercase">
                                    {count} Channels
                                  </span>
                                </div>
                              </motion.button>
                            );
                          })}
                        </div>
                      </div>


                    </div>
                  )}

                  {homeView === "category" && (
                    <div className="space-y-6">
                      {/* Category Header */}
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/5 pb-4">
                        <div className="flex items-center gap-3">
                          <button 
                            onClick={() => setHomeView("dashboard")}
                            className="w-10 h-10 rounded-full border border-white/10 bg-white/5 hover:bg-white/10 flex items-center justify-center text-white transition-all cursor-pointer shrink-0"
                          >
                            <ArrowLeft size={18} />
                          </button>
                          <div>
                            <span className="text-[8.5px] font-black text-primary uppercase tracking-[0.2em]">Viewing Category</span>
                            <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight uppercase leading-none mt-0.5">{selectedCategory}</h2>
                          </div>
                        </div>

                        {/* Search Category Box */}
                        <div className="relative w-full sm:w-64 shrink-0">
                          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30" />
                          <input 
                            type="text" 
                            placeholder="Search in category..." 
                            value={searchQuery}
                            onChange={e => setSearchQuery(e.target.value)}
                            className="w-full bg-white/[0.03] border border-white/5 rounded-xl pl-9 pr-4 py-2.5 text-[11px] text-white outline-none"
                          />
                        </div>
                      </div>

                      {/* Category Channels Grid */}
                      <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 xl:grid-cols-10 2xl:grid-cols-12 gap-3 sm:gap-4">
                        {filteredGridChannels.map((channel) => (
                          <motion.button
                            key={channel.id}
                            whileHover={{ y: -4, scale: 1.03 }}
                            whileTap={{ scale: 0.97 }}
                            onClick={() => {
                              if (fbUnlockEnabled && !fbUnlocked) {
                                setPendingChannelToPlay(channel);
                              } else {
                                setActiveChannel(channel);
                                setHomeView("player");
                              }
                            }}
                            className={`group relative flex flex-col items-center bg-[#080b18] border rounded-2xl p-4 text-center transition-all cursor-pointer ${
                              activeChannel?.id === channel.id
                                ? "border-primary bg-primary/10 shadow-[0_0_20px_rgba(255,50,50,0.15)]"
                                : "border-white/5 hover:border-white/15 hover:bg-[#0f142b]"
                            }`}
                          >
                            <div className="aspect-square w-full max-w-[85%] mx-auto bg-white rounded-full flex items-center justify-center p-0 mb-3 shadow-xl relative overflow-hidden group-hover:scale-105 transition-transform duration-500">
                              <img
                                src={optimizeImage(channel.logo, 160, 160) || DEFAULT_CHANNEL_LOGO}
                                alt={channel.name}
                                className={`w-full h-full object-contain ${brokenChannelIds.has(channel.id) ? 'opacity-30 grayscale' : ''}`}
                                style={{ 
                                  padding: `${channel.logoPadding || 0}%`,
                                  borderRadius: 'inherit'
                                }}
                                referrerPolicy="no-referrer"
                                onError={(e) => {
                                  e.currentTarget.src = DEFAULT_CHANNEL_LOGO;
                                }}
                              />
                              {brokenChannelIds.has(channel.id) && (
                                <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                                  <span className="text-[8px] bg-red-600 px-1 py-0.5 rounded text-white font-black">OFFLINE</span>
                                </div>
                              )}
                            </div>

                            <div className="w-full mt-1">
                              <h4 className="text-[10px] sm:text-xs font-black text-white truncate group-hover:text-primary transition-colors uppercase leading-none">
                                {channel.name}
                              </h4>
                            </div>
                          </motion.button>
                        ))}
                      </div>

                      {filteredGridChannels.length === 0 && (
                        <div className="py-20 text-center bg-white/[0.02] border border-white/5 rounded-3xl">
                          <AlertCircle className="text-white/20 mx-auto mb-3 animate-bounce" size={36} />
                          <h4 className="text-sm font-bold text-white/50">No Channels Found</h4>
                          <p className="text-white/30 text-[10px] mt-1">Try typing a different name or clear the filter.</p>
                        </div>
                      )}
                    </div>
                  )}

                  {homeView === "player" && activeChannel && (
                    <div className="space-y-6">
                      {/* Theatre Player Back Header */}
                      <div className="flex items-center gap-3">
                        <button 
                          onClick={() => setHomeView("category")}
                          className="w-10 h-10 rounded-full border border-white/10 bg-white/5 hover:bg-white/10 flex items-center justify-center text-white transition-all cursor-pointer shrink-0"
                        >
                          <ArrowLeft size={18} />
                        </button>
                        <div>
                          <span className="text-[8.5px] font-black text-emerald-400 uppercase tracking-[0.25em] animate-pulse">Now Playing</span>
                          <h2 className="text-lg sm:text-xl font-black text-white uppercase tracking-tight truncate leading-none mt-0.5">{activeChannel.name}</h2>
                        </div>
                      </div>

                      {/* Big Premium Player Container */}
                      <div className="relative group max-w-[1100px] mx-auto w-full aspect-video">
                        <div className="absolute -inset-1.5 bg-gradient-to-r from-primary/10 to-primary/0 rounded-[1.6rem] blur-2xl opacity-10 pointer-events-none" />
                        <div className="relative bg-black rounded-[1.2rem] overflow-hidden shadow-2xl border border-white/5 h-full w-full">
                          <VideoPlayer
                            src={activeChannel.url}
                            streamQuality={channelQualities[activeChannel.id] || streamQuality}
                            onReady={handlePlayerReady}
                            onError={handlePlayerError}
                            onActiveQualityChanged={setDetectedActiveQuality}
                            channelName={activeChannel.name}
                            categoryName={activeChannel.category || "General"}
                            onBack={() => setHomeView("category")}
                            onOpenExternal={() => {
                              if (activeChannel?.url) {
                                window.open(activeChannel.url, "_blank");
                              }
                            }}
                          />
                        </div>
                      </div>

                      {/* Horizontal slider list of Up Next channels in this category */}
                      <div className="space-y-3">
                        <div className="flex items-center justify-between border-b border-white/5 pb-2">
                          <h3 className="text-[10px] font-black text-white/40 uppercase tracking-widest flex items-center gap-2">
                            <span className="w-1 h-3 bg-primary rounded-full" />
                            Up Next In This Category
                          </h3>
                        </div>

                        <div className="flex gap-2.5 overflow-x-auto pb-4 snap-x no-scrollbar">
                          {channels.filter(c => c.category === activeChannel.category && c.id !== activeChannel.id).slice(0, 18).map((channel) => (
                            <motion.button
                              key={channel.id}
                              whileHover={{ y: -3 }}
                              whileTap={{ scale: 0.95 }}
                              onClick={() => {
                                if (fbUnlockEnabled && !fbUnlocked) {
                                  setPendingChannelToPlay(channel);
                                } else {
                                  setActiveChannel(channel);
                                }
                              }}
                              className="group relative flex flex-col items-center bg-[#070914] border border-white/5 rounded-2xl p-3 text-center transition-all cursor-pointer flex-shrink-0 snap-start w-24 sm:w-28"
                            >
                              <div className="aspect-square w-10 sm:w-12 bg-white rounded-full flex items-center justify-center p-0.5 mb-2 shadow-inner relative overflow-hidden group-hover:scale-105 transition-all">
                                <img 
                                  src={optimizeImage(channel.logo, 100, 100) || DEFAULT_CHANNEL_LOGO} 
                                  alt={channel.name}
                                  className="w-full h-full object-contain"
                                  style={{ padding: `${channel.logoPadding || 0}%`, borderRadius: "inherit" }}
                                  referrerPolicy="no-referrer"
                                />
                              </div>
                              <h4 className="text-[9px] sm:text-[10px] font-bold text-white/70 group-hover:text-primary truncate w-full uppercase tracking-tighter">{channel.name}</h4>
                            </motion.button>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </main>

      {/* Channel Editor Modal */}
      <AnimatePresence>
        {editingChanId && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6 backdrop-blur-md bg-black/60">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-[#0f111a] border border-white/10 w-full max-w-lg rounded-[2.5rem] overflow-hidden shadow-2xl"
            >
              <div className="p-6 border-b border-white/5 flex items-center justify-between bg-white/[0.02]">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-primary/10 rounded-xl">
                    <Tv size={20} className="text-primary" />
                  </div>
                  <h3 className="text-lg font-bold text-white tracking-tight">
                    {editingChanId === "new" ? "Add New Channel" : "Edit Channel Information"}
                  </h3>
                </div>
                <button onClick={() => setEditingChanId(null)} className="p-2 hover:bg-white/10 rounded-full transition-colors"><X size={20} className="text-white/40" /></button>
              </div>

              <div className="p-8 space-y-6">
                <div className="space-y-4">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black text-white/30 uppercase tracking-[0.2em] ml-1">Channel Name</label>
                    <input type="text" value={editingChanName} onChange={e => setEditingChanName(e.target.value)} className="w-full bg-black/40 border border-white/10 rounded-2xl px-4 py-3 text-xs text-white outline-none focus:border-primary/50 transition-colors" placeholder="e.g. Discovery HD" />
                  </div>
                  
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black text-white/30 uppercase tracking-[0.2em] ml-1">Stream URL</label>
                    <input type="url" value={editingChanUrl} onChange={e => setEditingChanUrl(e.target.value)} className="w-full bg-black/40 border border-white/10 rounded-2xl px-4 py-3 text-xs text-white font-mono outline-none focus:border-primary/50 transition-colors" placeholder="https://.../index.m3u8" />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-black text-white/30 uppercase tracking-[0.2em] ml-1">Category</label>
                      <select value={editingChanCategory} onChange={e => setEditingChanCategory(e.target.value)} className="w-full bg-black/40 border border-white/10 rounded-2xl px-4 py-3 text-xs text-white outline-none focus:border-primary/50 transition-colors appearance-none">
                        {currentEditableCategories.map(cat => <option key={cat.id || cat.name} value={cat.name}>{cat.name}</option>)}
                      </select>
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-black text-white/30 uppercase tracking-[0.2em] ml-1">Channel Logo</label>
                      <div className="space-y-2">
                        <div className="flex gap-2">
                          <input type="url" value={editingChanLogo} onChange={e => setEditingChanLogo(e.target.value)} className="flex-1 bg-black/40 border border-white/10 rounded-2xl px-4 py-2.5 text-[10px] text-white outline-none focus:border-primary/50 transition-colors" placeholder="Logo URL..." />
                          <div className="flex items-center gap-1.5 bg-black/40 border border-white/10 rounded-2xl px-2" title="Adjust Logo Padding (Plus for more space, Minus for less)">
                            <button 
                              onClick={() => setEditingChanLogoPadding(Math.max(0, editingChanLogoPadding - 5))}
                              className="w-6 h-6 flex items-center justify-center rounded-lg bg-white/5 hover:bg-white/10 text-white/40 hover:text-white transition-colors"
                            >
                              <Minus size={10} />
                            </button>
                            <span className="text-[9px] font-bold text-primary w-4 text-center">{editingChanLogoPadding}</span>
                            <button 
                              onClick={() => setEditingChanLogoPadding(Math.min(50, editingChanLogoPadding + 5))}
                              className="w-6 h-6 flex items-center justify-center rounded-lg bg-white/5 hover:bg-white/10 text-white/40 hover:text-white transition-colors"
                            >
                              <Plus size={10} />
                            </button>
                          </div>
                        </div>
                        <label className={`w-full h-10 border rounded-2xl cursor-pointer transition-all flex items-center justify-center gap-2 group/file ${isLogoUploading ? 'bg-primary/20 border-primary/40 animate-pulse' : 'bg-primary/5 border-primary/10 hover:bg-primary/20 hover:border-primary/30'}`}>
                          {isLogoUploading ? (
                            <>
                              <RefreshCw size={14} className="text-primary animate-spin" />
                              <span className="text-[9px] text-primary font-bold uppercase tracking-wider">Uploading...</span>
                            </>
                          ) : (
                            <>
                              <FileUp size={14} className="text-primary group-hover/file:scale-110 transition-transform" />
                              <span className="text-[9px] text-primary font-bold uppercase tracking-wider">Upload from Gallery</span>
                            </>
                          )}
                          <input type="file" accept="image/*" className="hidden" disabled={isLogoUploading} onChange={async (e) => {
                            const file = e.target.files?.[0];
                            if (file) {
                              try {
                                setIsLogoUploading(true);
                                setAdminStatus("Processing logo...");
                                const url = await handleImageUpload(file);
                                setEditingChanLogo(url);
                                setAdminStatus("Logo ready!");
                                setTimeout(() => setAdminStatus(null), 3000);
                              } catch (err) {
                                console.error("Logo upload error:", err);
                                setAdminError("Logo upload failed");
                                setTimeout(() => setAdminError(null), 3000);
                              } finally {
                                setIsLogoUploading(false);
                              }
                            }
                          }} />
                        </label>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex gap-3 pt-4">
                  <button onClick={() => setEditingChanId(null)} className="flex-1 py-3.5 bg-white/5 text-white/60 text-[11px] font-black uppercase tracking-widest rounded-2xl hover:bg-white/10 transition-all">Cancel</button>
                  <button 
                    onClick={async () => {
                      if (editingChanId === "new") {
                        await handleAdminAddChannel(editingChanName, editingChanUrl, editingChanLogo, editingChanCategory, editingChanLogoPadding);
                      } else {
                        await handleAdminUpdateChannel(editingChanId, {
                          name: editingChanName,
                          url: editingChanUrl,
                          logo: editingChanLogo,
                          category: editingChanCategory,
                          logoPadding: editingChanLogoPadding
                        });
                      }
                      setEditingChanId(null);
                    }} 
                    className="flex-1 py-3.5 bg-primary text-white text-[11px] font-black uppercase tracking-widest rounded-2xl shadow-xl shadow-primary/20 hover:scale-[1.02] active:scale-95 transition-all"
                  >
                    Save Changes
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Deletion Confirmation Modal */}
      <AnimatePresence>
        {deletingChanId && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 backdrop-blur-md bg-black/60">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-[#0f111a] border border-red-500/10 w-full max-w-sm rounded-[2.5rem] p-8 text-center shadow-2xl"
            >
              <div className="w-16 h-16 bg-red-500/10 rounded-full flex items-center justify-center mx-auto mb-6 border border-red-500/20">
                <Trash2 className="text-red-500" size={32} />
              </div>
              <h3 className="text-xl font-bold text-white mb-2">Delete Channel?</h3>
              <p className="text-white/40 text-xs mb-8 leading-relaxed">This channel will be permanently removed from the cloud database. This action cannot be undone.</p>
              <div className="flex gap-3">
                <button onClick={() => setDeletingChanId(null)} className="flex-1 py-3.5 bg-white/5 text-white/60 text-[11px] font-black uppercase tracking-widest rounded-2xl hover:bg-white/10 transition-all">Cancel</button>
                <button 
                  onClick={() => {
                    handleAdminDeleteChannel(deletingChanId);
                    setDeletingChanId(null);
                  }} 
                  className="flex-1 py-3.5 bg-red-500 text-white text-[11px] font-black uppercase tracking-widest rounded-2xl shadow-xl shadow-red-500/20 hover:bg-red-600 transition-all"
                >
                  Delete Permanently
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Category Edit Modal */}
      <AnimatePresence>
        {editingCatId && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 backdrop-blur-md bg-black/60">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-[#0f111a] border border-white/5 w-full max-w-md rounded-[2.5rem] p-8 shadow-2xl relative"
            >
              <h3 className="text-xl font-bold text-white mb-6 uppercase tracking-wider text-center">Edit Category</h3>
              
              <div className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-white/30 uppercase tracking-[0.2em] ml-1">Category Name</label>
                  <input 
                    type="text" 
                    value={editingCatName} 
                    onChange={e => setEditingCatName(e.target.value)} 
                    className="w-full bg-black/40 border border-white/10 rounded-2xl px-4 py-3 text-xs text-white outline-none focus:border-primary/50 transition-colors" 
                    placeholder="Category Name..."
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-white/30 uppercase tracking-[0.2em] ml-1">Category Logo URL</label>
                  <input 
                    type="url" 
                    value={editingCatLogo} 
                    onChange={e => setEditingCatLogo(e.target.value)} 
                    className="w-full bg-black/40 border border-white/10 rounded-2xl px-4 py-3 text-xs text-white outline-none focus:border-primary/50 transition-colors" 
                    placeholder="https://..."
                  />
                </div>

                <div className="flex items-center justify-between bg-black/20 p-3 rounded-2xl border border-white/5">
                  <span className="text-xs font-black text-white/60">Hide from Home Tabs</span>
                  <button 
                    onClick={() => setEditingCatIsHidden(!editingCatIsHidden)}
                    className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                      editingCatIsHidden 
                        ? 'bg-red-500/10 text-red-400 border border-red-500/20' 
                        : 'bg-white/5 text-white/40 hover:text-white border border-white/10'
                    }`}
                  >
                    {editingCatIsHidden ? <EyeOff size={14} /> : <Eye size={14} />}
                  </button>
                </div>

                <div className="flex gap-3 pt-4">
                  <button onClick={() => setEditingCatId(null)} className="flex-1 py-3.5 bg-white/5 text-white/60 text-[11px] font-black uppercase tracking-widest rounded-2xl hover:bg-white/10 transition-all">Cancel</button>
                  <button 
                    onClick={() => {
                      handleUpdateCategory(editingCatId, {
                        name: editingCatName,
                        logo: editingCatLogo,
                        isHidden: editingCatIsHidden
                      });
                      setEditingCatId(null);
                    }} 
                    className="flex-1 py-3.5 bg-primary text-white text-[11px] font-black uppercase tracking-widest rounded-2xl shadow-xl shadow-primary/20 hover:scale-[1.02] active:scale-95 transition-all"
                  >
                    Save Changes
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>


              {/* Floating Navigation Tabs */}
      {homeView !== "player" && (
        <div className="fixed bottom-0 left-0 right-0 z-50 bg-[#070708]/96 border-t border-white/5 backdrop-blur-md shadow-2xl flex justify-around items-center px-4 portrait:py-3 landscape:py-1.5 portrait:h-16 landscape:h-12 md:h-18 pb-[calc(8px+env(safe-area-inset-bottom))]">
          <button
            onClick={() => {
              setActiveTab("home");
              if (homeView !== "dashboard") setHomeView("dashboard");
            }}
            className={`flex flex-col items-center justify-center flex-1 cursor-pointer transition-all group ${
              activeTab === "home"
                ? "text-primary scale-105"
                : "text-white/35 hover:text-white/70"
            }`}
          >
            <Home size={22} className="transition-all duration-300 group-hover:scale-110 group-hover:text-primary" />
            <span className="portrait:text-[11px] landscape:text-[10px] mt-1 tracking-wide font-black uppercase">Home</span>
          </button>

          <button
            onClick={() => setActiveTab("settings")}
            className={`flex flex-col items-center justify-center flex-1 cursor-pointer transition-all group ${
              activeTab === "settings"
                ? "text-primary scale-105"
                : "text-white/35 hover:text-white/70"
            }`}
          >
            <Settings size={22} className="transition-all duration-300 group-hover:scale-110 group-hover:text-primary" />
            <span className="portrait:text-[11px] landscape:text-[10px] mt-1 tracking-wide font-black uppercase">Settings</span>
          </button>

          {(showAdminTrigger || isAdmin) && (
            <button
              onClick={() => setActiveTab("admin")}
              className={`flex flex-col items-center justify-center flex-1 cursor-pointer transition-all group ${
                activeTab === "admin"
                  ? "text-red-400 scale-105"
                  : "text-white/35 hover:text-white/70"
              }`}
            >
              <LayoutDashboard size={22} className="transition-all duration-300 group-hover:scale-110 group-hover:text-red-400" />
              <span className="portrait:text-[11px] landscape:text-[10px] mt-1 tracking-wide font-black uppercase">Admin Panel</span>
            </button>
          )}
        </div>
      )}

      {/* Quota Exhausted Warning Indicator (Admin Only) */}
      <AnimatePresence>
        {isAdmin && (sessionStorage.getItem("firestore_quota_exhausted") === "true" || onlineUsersCount > 1000) && !trafficNoticeDismissed && (
          <motion.div 
            initial={{ y: 50, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 20, opacity: 0 }}
            className="fixed bottom-20 left-4 right-4 z-[60] bg-red-600 text-white text-[10px] font-bold py-3 px-5 rounded-2xl flex items-center justify-between shadow-2xl backdrop-blur-md"
          >
            <div className="flex items-center gap-3">
              <AlertCircle size={14} className="animate-pulse" />
              <div className="flex flex-col">
                <span className="uppercase tracking-widest">Database High Traffic Detected</span>
                <span className="text-[8px] opacity-60">Admin Notice: {onlineUsersCount} active users. App using offline cache.</span>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button 
                onClick={() => {
                  sessionStorage.removeItem("firestore_quota_exhausted");
                  localStorage.removeItem("tuhinext_last_sync_time");
                  window.location.reload();
                }}
                className="bg-white/10 px-3 py-1 rounded-lg border border-white/20 text-[9px] hover:bg-white/20 transition-colors"
              >
                Sync
              </button>
              <button 
                onClick={() => setTrafficNoticeDismissed(true)}
                className="p-1 hover:bg-white/10 rounded-lg transition-colors"
              >
                <X size={14} />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
