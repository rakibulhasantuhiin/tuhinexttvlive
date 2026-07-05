const fs = require('fs');
let code = fs.readFileSync('src/components/AdminView.tsx', 'utf8');

const target = `  useEffect(() => {
    checkAuth();
    fetchChannels();
    fetchSettings();
  }, []);`;

const replacement = `  useEffect(() => {
    checkAuth();
    fetchChannels();
    fetchSettings();

    const socket = io();

    socket.on('channels_updated', (data) => {
      setChannels(data);
    });

    socket.on('settings_updated', (data) => {
      setSettings(data);
    });

    return () => {
      socket.disconnect();
    };
  }, []);`;

code = code.replace(target, replacement);
fs.writeFileSync('src/components/AdminView.tsx', code);
