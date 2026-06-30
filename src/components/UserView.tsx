import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { PlayCircle, Users } from 'lucide-react';
import { Channel, AppSettings } from '../types';
import StreamPlayer from './StreamPlayer';

export default function UserView() {
  const [channels, setChannels] = useState<Channel[]>([]);
  const [activeChannel, setActiveChannel] = useState<Channel | null>(null);
  const [settings, setSettings] = useState<AppSettings | null>(null);
  const [liveViewers, setLiveViewers] = useState(0);
  const [clickCount, setClickCount] = useState(0);
  const clickTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    if (clickCount >= 5) {
      navigate('/admin');
      setClickCount(0);
    }
  }, [clickCount, navigate]);

  const handleLogoClick = () => {
    setClickCount(prev => prev + 1);
    if (clickTimeoutRef.current) {
      clearTimeout(clickTimeoutRef.current);
    }
    clickTimeoutRef.current = setTimeout(() => {
      setClickCount(0);
    }, 2000);
  };

  useEffect(() => {
    const sse = new EventSource('/api/live-viewers');
    sse.onmessage = (e) => {
      try {
        const data = JSON.parse(e.data);
        setLiveViewers(data.count);
      } catch (err) {
        console.error(err);
      }
    };
    return () => sse.close();
  }, []);

  const fetchChannels = () => {
    fetch('/api/channels')
      .then(res => res.json())
      .then(data => {
        const visibleChannels = data.filter((c: Channel) => !c.isHidden);
        setChannels(prev => {
          if (JSON.stringify(prev) !== JSON.stringify(visibleChannels)) {
            return visibleChannels;
          }
          return prev;
        });
      })
      .catch(err => console.error("Failed to load channels", err));
  };

  const formatViewers = (count: number) => {
    if (count >= 1000000) {
      return (count / 1000000).toFixed(1).replace(/\.0$/, '') + 'M';
    }
    if (count >= 1000) {
      return (count / 1000).toFixed(1).replace(/\.0$/, '') + 'K';
    }
    return count.toString();
  };

  const fetchSettings = () => {
    fetch('/api/settings')
      .then(res => res.json())
      .then(data => {
        setSettings(data);
        if (data.appName) {
          document.title = data.appName;
        }
        if (data.appLogo) {
          let link = document.querySelector("link[rel~='icon']") as HTMLLinkElement;
          if (!link) {
            link = document.createElement('link');
            link.rel = 'icon';
            document.head.appendChild(link);
          }
          link.href = data.appLogo;
        }
      })
      .catch(err => console.error("Failed to load settings", err));
  };

  useEffect(() => {
    fetchChannels();
    fetchSettings();
    const interval = setInterval(() => {
      fetchChannels();
      fetchSettings();
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (channels.length > 0 && !activeChannel) {
      setActiveChannel(channels[0]);
    }
  }, [channels, activeChannel]);

  return (
    <div className="flex flex-col h-screen overflow-hidden will-change-transform transform-gpu antialiased bg-zinc-950">
      {/* Header */}
      <header className="py-3 md:h-16 border-b border-zinc-800 flex flex-col md:flex-row items-center justify-between px-4 md:px-6 bg-zinc-900/50 gap-2 md:gap-0">
        <div className="flex-1 hidden md:block"></div>
        <div className="flex justify-center md:flex-1">
          <div 
            className="flex items-center justify-center gap-3 select-none cursor-pointer p-2 rounded-lg hover:bg-zinc-800/50 transition-colors"
            onClick={handleLogoClick}
          >
          {settings?.appLogo ? (
            <div className="w-8 h-8 rounded-lg overflow-hidden flex items-center justify-center bg-white shrink-0 pointer-events-none">
              <img src={settings.appLogo} alt="Logo" className="w-full h-full object-contain p-1" />
            </div>
          ) : (
            <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center font-bold text-white pointer-events-none">
              {settings?.appName ? settings.appName.charAt(0).toUpperCase() : 'T'}
            </div>
          )}
          <h1 className="text-xl font-bold tracking-tight text-white pointer-events-none">{settings?.appName || "TUHINEXT TV"}</h1>
          </div>
        </div>
        <div className="hidden md:flex flex-1 justify-end">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-zinc-900/40 border border-zinc-700/50 backdrop-blur-md shadow-lg cursor-default select-none pointer-events-none" title="Live Viewers">
            <div className="relative flex items-center justify-center">
              <span className="absolute w-2.5 h-2.5 bg-red-500 rounded-full animate-ping opacity-75"></span>
              <span className="relative w-2 h-2 bg-red-500 rounded-full"></span>
            </div>
            <Users className="w-4 h-4 text-zinc-400" />
            <span className="text-xs font-bold text-zinc-200 tracking-wide">{formatViewers(liveViewers)}</span>
          </div>
        </div>
      </header>

      <main className="flex-1 flex flex-col md:flex-row overflow-hidden min-h-0 relative">
        {/* Floating Live Viewers - Mobile Only */}
        <div className="md:hidden absolute bottom-6 left-1/2 -translate-x-1/2 z-[60] pointer-events-none">
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-zinc-900/80 border border-zinc-700/50 backdrop-blur-md shadow-2xl">
            <div className="relative flex items-center justify-center">
              <span className="absolute w-2.5 h-2.5 bg-red-500 rounded-full animate-ping opacity-75"></span>
              <span className="relative w-2 h-2 bg-red-500 rounded-full"></span>
            </div>
            <Users className="w-3.5 h-3.5 text-zinc-400" />
            <span className="text-xs font-bold text-zinc-200 tracking-wide">{formatViewers(liveViewers)}</span>
          </div>
        </div>

        {/* Channels Sidebar / Bottom List */}
        <aside className="w-full md:w-80 border-t md:border-t-0 md:border-r border-zinc-800 bg-zinc-900/30 flex flex-col flex-1 md:flex-none md:h-full md:min-h-0 md:order-first order-last overflow-hidden">
          <div className="flex-1 overflow-y-auto overflow-x-hidden p-2 space-y-1">
            {channels.map((channel) => (
              <div
                key={channel.id}
                onClick={() => setActiveChannel(channel)}
                className={`p-3 rounded-lg flex items-center gap-3 cursor-pointer group transition-colors ${
                  activeChannel?.id === channel.id
                    ? 'bg-indigo-600/10 border border-indigo-500/30'
                    : 'hover:bg-zinc-800/50 border border-transparent'
                }`}
              >
                <div className="w-10 h-10 bg-zinc-800 rounded-full overflow-hidden flex-shrink-0 text-center flex items-center justify-center text-xs text-zinc-400 border border-zinc-700/50">
                  {channel.logo ? (
                    <img src={channel.logo} alt={channel.name} className="w-full h-full object-contain p-1 bg-white" />
                  ) : (
                    channel.name.substring(0, 4).toUpperCase()
                  )}
                </div>
                <div className="flex-1 overflow-hidden">
                  <div className={`text-sm font-semibold truncate ${activeChannel?.id === channel.id ? 'text-white' : 'text-zinc-200'}`}>
                    {channel.name}
                  </div>
                </div>
                {activeChannel?.id === channel.id && (
                  <div className="flex flex-col gap-1">
                    <div className="w-4 h-1 bg-indigo-500 rounded-full animate-pulse"></div>
                    <div className="w-4 h-1 bg-indigo-500 rounded-full animate-pulse" style={{ animationDelay: '150ms' }}></div>
                  </div>
                )}
              </div>
            ))}
            {channels.length === 0 && (
              <div className="p-4 text-center text-zinc-500 text-sm">
                No channels available.
              </div>
            )}
          </div>
        </aside>

        {/* Main Player Area */}
        <section className="w-full md:flex-1 flex flex-col bg-zinc-950 p-0 md:p-6 space-y-0 md:space-y-6 overflow-y-auto md:overflow-hidden order-first md:order-last shrink-0 md:min-w-0">
          <div className="relative w-full aspect-video md:aspect-auto md:flex-1 md:min-h-0 bg-black md:rounded-xl md:border border-zinc-800 flex flex-col items-center justify-center group overflow-hidden md:shadow-2xl shrink-0">
            {activeChannel ? (
              <>
                <div className="w-full h-full relative z-0">
                  <StreamPlayer url={activeChannel.url} />
                </div>
                {/* Overlay Info (shown briefly or on hover - we can just keep it visible but pointer-events-none so it doesn't block controls, or let player controls handle it. We will position it at top so it doesn't block bottom controls) */}
                <div className="absolute top-0 inset-x-0 bg-gradient-to-b from-black/80 to-transparent flex items-start p-4 md:p-6 opacity-0 group-hover:opacity-100 transition-opacity z-10 pointer-events-none">
                  <div className="w-full flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      {activeChannel.logo && (
                         <div className="w-10 h-10 bg-zinc-800 rounded-full flex items-center justify-center overflow-hidden border border-zinc-700/50 shrink-0">
                            <img src={activeChannel.logo} className="w-full h-full object-contain p-1 bg-white" />
                         </div>
                      )}
                      <div>
                        <h2 className="font-bold text-white text-base md:text-lg">{activeChannel.name}</h2>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse"></span>
                      <h3 className="text-[10px] md:text-xs font-bold uppercase tracking-widest text-red-400">
                        Now Playing
                      </h3>
                    </div>
                  </div>
                </div>
              </>
            ) : (
              <div className="flex flex-col items-center text-zinc-500 z-10">
                <PlayCircle className="w-12 h-12 md:w-16 md:h-16 mb-4 opacity-30" />
                <p className="text-xs md:text-sm font-medium">Select a channel to start streaming</p>
              </div>
            )}
            
            {!activeChannel && (
               <div className="absolute bottom-4 left-4 text-zinc-700 font-mono text-[10px] md:text-sm opacity-20 z-0">WAITING_FOR_STREAM // SELECT_CHANNEL</div>
            )}
          </div>
        </section>
      </main>
    </div>
  );
}
