const fs = require('fs');
let code = fs.readFileSync('src/components/UserView.tsx', 'utf8');

const target = `  useEffect(() => {
    fetchChannels();
    fetchSettings();
    const interval = setInterval(() => {
      fetchChannels();
      fetchSettings();
    }, 5000);
    return () => clearInterval(interval);
  }, []);`;

const replacement = `  useEffect(() => {
    fetchChannels();
    fetchSettings();
    
    const socket = io();

    socket.on('channels_updated', (data) => {
      const visibleChannels = data.filter(c => !c.isHidden);
      setChannels(visibleChannels);
    });

    socket.on('force_play_channel', (channel) => {
      if (!channel.isHidden) {
        setActiveChannel(channel);
      }
    });

    socket.on('settings_updated', (data) => {
      setSettings(data);
      if (data.appName) document.title = data.appName;
      if (data.appLogo) {
        let link = document.querySelector("link[rel~='icon']");
        if (!link) {
          link = document.createElement('link');
          link.rel = 'icon';
          document.head.appendChild(link);
        }
        link.href = data.appLogo;
      }
    });

    return () => {
      socket.disconnect();
    };
  }, []);`;

code = code.replace(target, replacement);
fs.writeFileSync('src/components/UserView.tsx', code);
